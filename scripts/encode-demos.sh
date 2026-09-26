#!/usr/bin/env bash
#
# Encodes raw demonstration footage into the two renditions the app serves, and
# prints a manifest of the keys to store in the catalogue.
#
# Why this exists rather than a video platform: the library is ~30 fixed clips
# that are filmed once and rarely change. Transcoding them is a one-off job, so
# paying a per-minute service to do it forever is renting a solution to a
# problem that has already been solved. What is left — storage and delivery —
# is what a zero-egress bucket behind a CDN does for nothing.
#
# Output is a flat directory of content-addressed files. The hash in each name
# is what makes `Cache-Control: immutable` safe: a re-cut is a different file at
# a different URL, so nothing anywhere ever needs a cache purge.
#
#   ./scripts/encode-demos.sh [IN_DIR] [OUT_DIR]
#
# Then upload and record the keys:
#
#   rclone sync dist-media/ r2:100mph-media/demos/ \
#     --header-upload "Cache-Control: public, max-age=31536000, immutable"
#
set -euo pipefail

IN_DIR="${1:-raw}"
OUT_DIR="${2:-dist-media}"
MANIFEST="$OUT_DIR/manifest.json"

# The key prefix the app resolves against EXPO_PUBLIC_MEDIA_BASE_URL. Keep it in
# step with wherever the upload above actually lands.
KEY_PREFIX="demos"

for tool in ffmpeg ffprobe; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "error: $tool not found. Install ffmpeg and re-run." >&2
    exit 1
  }
done

[ -d "$IN_DIR" ] || { echo "error: no such input directory: $IN_DIR" >&2; exit 1; }

mkdir -p "$OUT_DIR"

# A stable, URL-safe stem from the filename: "Back Extension (Final).mov" ->
# "back-extension-final".
slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/\.[a-z0-9]+$//; s/[^a-z0-9]+/-/g; s/^-+|-+$//g'
}

# Encode one rendition, name it by the hash of its own bytes, echo the key.
#
# Audio is dropped (-an): demos are silent by design — they are filmed on
# phones in busy gyms and the app never plays sound. Stripping it here rather
# than trusting the source means a clip with a chatty soundtrack can never
# reach a member.
#
# The hash is taken after encoding rather than from the source because it is the
# delivered file that gets cached forever — two different sources that encode to
# identical output should, correctly, be one object.
encode() {
  local src="$1" stem="$2" height="$3" bitrate="$4" maxrate="$5" bufsize="$6"
  local tmp="$OUT_DIR/.$stem-$height.tmp.mp4"

  ffmpeg -nostdin -loglevel error -y -i "$src" \
    -vf "scale=-2:$height" \
    -c:v libx264 -profile:v high -level 4.0 -crf "$bitrate" -preset slow \
    -maxrate "$maxrate" -bufsize "$bufsize" \
    -pix_fmt yuv420p \
    -an \
    -movflags +faststart \
    "$tmp"

  local hash
  hash="$(sha256sum "$tmp" | cut -c1-8)"
  local name="$stem-$hash-${height}p.mp4"
  mv "$tmp" "$OUT_DIR/$name"
  printf '%s/%s' "$KEY_PREFIX" "$name"
}

entries=()
shopt -s nullglob nocaseglob

for src in "$IN_DIR"/*.{mov,mp4,m4v,avi,mkv}; do
  stem="$(slugify "$(basename "$src")")"
  echo "==> $stem"

  # 720p is what the app asks for. -crf 23 with a 2M ceiling keeps a 45s demo
  # around 8MB, which is small enough that adaptive bitrate would be solving a
  # problem the file does not have.
  key720="$(encode "$src" "$stem" 720 23 2M 4M)"

  # 480p is not wired into the client yet. It is produced now because encoding
  # is the slow half and doing it later means re-running this over every source
  # again; the file costs nothing to keep and is there the day a member on a
  # thin connection needs it.
  key480="$(encode "$src" "$stem" 480 25 900k 1800k)"

  # One second in, not frame zero — the first frame of a demo is usually the
  # subject standing still before the movement starts.
  poster_tmp="$OUT_DIR/.$stem.tmp.webp"
  ffmpeg -nostdin -loglevel error -y -ss 1 -i "$src" -frames:v 1 \
    -vf "scale=-2:720" -quality 80 "$poster_tmp"
  poster_hash="$(sha256sum "$poster_tmp" | cut -c1-8)"
  poster_name="$stem-$poster_hash.webp"
  mv "$poster_tmp" "$OUT_DIR/$poster_name"

  duration="$(ffprobe -v error -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "$src" | cut -d. -f1)"

  entries+=("$(printf '  {
    "source": "%s",
    "video_url": "%s",
    "video_url_480": "%s",
    "thumbnail_url": "%s/%s",
    "duration_sec": %s
  }' "$(basename "$src")" "$key720" "$key480" "$KEY_PREFIX" "$poster_name" "${duration:-null}")")
done

shopt -u nullglob nocaseglob

if [ ${#entries[@]} -eq 0 ]; then
  echo "error: no video files found in $IN_DIR" >&2
  exit 1
fi

# Commas between, none after. Slicing off the last element does not work here:
# with a single demo the slice is empty and printf still fires its format once,
# emitting a stray comma into otherwise valid JSON.
{
  echo "["
  last=$(( ${#entries[@]} - 1 ))
  for i in "${!entries[@]}"; do
    if [ "$i" -lt "$last" ]; then
      printf '%s,\n' "${entries[$i]}"
    else
      printf '%s\n' "${entries[$i]}"
    fi
  done
  echo "]"
} > "$MANIFEST"

echo
echo "Encoded ${#entries[@]} demo(s) into $OUT_DIR"
echo "Manifest: $MANIFEST"
echo
echo "video_url / thumbnail_url in the exercise documents take these keys verbatim."
