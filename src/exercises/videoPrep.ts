import type { InputVideoTrack } from 'mediabunny';

/**
 * Turns whatever video an admin picks into the one kind every member's device
 * plays: H.264 in an MP4, at most 720p and 30 fps, with no sound and no
 * metadata — the same thing scripts/encode-demos.sh makes of the bundled demos.
 *
 * Phones record 1080p or 4K, often in HEVC, at 10–40 Mbit/s. Sent as-is that
 * is slow to start on mobile data, and HEVC does not play in every browser at
 * all. Converting here, in the admin's own browser, is what lets an admin
 * upload straight from their camera roll with no server doing the work and no
 * developer re-encoding anything by hand.
 *
 * Two engines do the converting:
 * - The browser's own decoder and encoder (WebCodecs, through Mediabunny).
 *   Usually hardware; a 30-second clip takes seconds.
 * - ffmpeg compiled to WebAssembly, for a file the browser cannot decode — an
 *   iPhone's HEVC in Chrome on Linux, say. It reads almost anything but runs on
 *   one core, so it takes minutes, and its 32 MB are only fetched when needed
 *   (and cached by the browser after that).
 *
 * A clip that is already small H.264 is not re-encoded, which would only lose
 * quality: its video is copied as-is and just the sound and metadata go.
 */

/** A delivered frame is at most 1280×720 landscape, 720×1280 portrait. */
const SHORT_SIDE = 720;
const LONG_SIDE = 1280;
const MAX_FPS = 30;
/** What a 720p demo from encode-demos.sh averages (crf 23, capped at 2 Mbit/s). */
const BITRATE_720P = 1_500_000;
/**
 * An H.264 clip no bigger than 720p and no heavier than this is sent as it is.
 * That covers what WhatsApp and most editing apps export; re-encoding those
 * would only lose quality to save a little.
 */
const COPY_MAX_BITRATE = 2_400_000;

export const MAX_SOURCE_MINUTES = 10;
const MAX_SOURCE_BYTES = 4 * 1024 ** 3;

// Pinned: the worker below is written against this build's API.
const FFMPEG_CORE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js';
const FFMPEG_WASM_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm';
const FFMPEG_WASM_BYTES = 32_232_419;

const CODEC_LABEL: Record<string, string> = { avc: 'H.264', hevc: 'HEVC', vp8: 'VP8', vp9: 'VP9', av1: 'AV1' };

export class UploadCancelled extends Error {
  constructor() {
    super('Upload cancelled.');
  }
}

export type VideoPlan = {
  /** 'copy': already small H.264, so only the sound and metadata are dropped. 'compress': re-encoded here. */
  action: 'copy' | 'compress';
  /** This browser cannot decode the file, so the slow WebAssembly converter does it. */
  slow: boolean;
  /** As members will see it, rotation applied. 0 when the file could not be read ahead of time. */
  width: number;
  height: number;
  fps: number | null;
  durationSec: number | null;
  /** "HEVC", for telling the admin why a conversion is slow. */
  codecLabel: string | null;
  /** The size it is delivered at. Null when unknown until ffmpeg opens it. */
  target: { width: number; height: number } | null;
};

export type PrepProgress =
  | { step: 'loading'; progress: number }
  | { step: 'compressing'; progress: number; secondsLeft: number | null };

type Size = { width: number; height: number };

/** Scaled down (never up) to fit 720p in either orientation, in the even numbers encoders want. */
function deliveredSize(width: number, height: number): Size {
  const scale = Math.min(1, SHORT_SIDE / Math.min(width, height), LONG_SIDE / Math.max(width, height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/** The 720p budget, scaled by picture area, so a small clip is not given more bits than it can use. */
function bitrateFor(size: Size | null): number {
  if (!size) return BITRATE_720P;
  const area = (size.width * size.height) / (1280 * 720);
  return Math.round(BITRATE_720P * Math.max(0.35, Math.min(1, area)));
}

const UNREADABLE_AHEAD: VideoPlan = {
  action: 'compress',
  slow: true,
  width: 0,
  height: 0,
  fps: null,
  durationSec: null,
  codecLabel: null,
  target: null,
};

/**
 * Reads the file's headers — nothing is decoded, so this is quick even for a
 * large file — and decides what has to happen to it. Throws, with a message
 * for the admin, for a file that is not a usable video.
 */
export async function planVideo(file: File): Promise<VideoPlan> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`That file is ${(file.size / 1024 ** 3).toFixed(1)} GB. Trim it to just the exercise and try again.`);
  }

  const mb = await import('mediabunny');
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    let track: InputVideoTrack | null;
    try {
      track = await input.getPrimaryVideoTrack();
    } catch {
      // A container Mediabunny does not read, such as AVI. ffmpeg reads nearly anything.
      return UNREADABLE_AHEAD;
    }
    if (!track) throw new Error('That file has no video in it.');

    const durationSec = await track.computeDuration();
    if (durationSec > MAX_SOURCE_MINUTES * 60) {
      throw new Error(
        `That video is ${Math.round(durationSec / 60)} minutes long. Trim it to just the exercise — under ${MAX_SOURCE_MINUTES} minutes — and try again.`
      );
    }

    const width = track.displayWidth;
    const height = track.displayHeight;
    const target = deliveredSize(width, height);
    const stats = await track.computePacketStats();
    const fps = stats.averagePacketRate || null;
    const format = await input.getFormat();
    const decodable = await track.canDecode();

    const alreadySmall =
      track.codec === 'avc' &&
      (format === mb.MP4 || format === mb.QTFF) &&
      target.width === width &&
      target.height === height &&
      (fps ?? 0) <= 60.5 &&
      stats.averageBitrate <= COPY_MAX_BITRATE &&
      decodable &&
      !(await track.hasHighDynamicRange());

    const encodable =
      alreadySmall || (await mb.canEncodeVideo('avc', { width: target.width, height: target.height, bitrate: bitrateFor(target) }));

    return {
      action: alreadySmall ? 'copy' : 'compress',
      slow: !alreadySmall && !(decodable && encodable),
      width,
      height,
      fps,
      durationSec,
      codecLabel: track.codec ? (CODEC_LABEL[track.codec] ?? track.codec.toUpperCase()) : null,
      target,
    };
  } finally {
    input.dispose();
  }
}

/** Seconds left, from how long the part already done took. Null until there is enough to go on. */
function remainingTime(): (progress: number) => number | null {
  const started = Date.now();
  return (progress) => {
    const elapsed = (Date.now() - started) / 1000;
    if (progress < 0.03 || elapsed < 3) return null;
    return Math.max(0, Math.round((elapsed * (1 - progress)) / progress));
  };
}

/**
 * Produces the MP4 that gets uploaded, reporting progress. The source file is
 * read in pieces as it goes, so a 1 GB clip does not have to fit in memory.
 */
export async function prepareVideo(
  file: File,
  plan: VideoPlan,
  onProgress: (progress: PrepProgress) => void,
  signal?: AbortSignal
): Promise<File> {
  const name = `${file.name.replace(/\.[^./]+$/, '') || 'video'}.mp4`;
  const fast = plan.slow ? null : await convertInBrowser(file, plan, onProgress, signal);
  const bytes = fast ?? (await convertWithFfmpeg(file, plan, onProgress, signal));
  return new File([bytes], name, { type: 'video/mp4' });
}

/** WebCodecs. Resolves null if the browser turns the job down, so the caller can fall back to ffmpeg. */
async function convertInBrowser(
  file: File,
  plan: VideoPlan,
  onProgress: (progress: PrepProgress) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  if (signal?.aborted) throw new UploadCancelled();
  const mb = await import('mediabunny');
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
  try {
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: 'primary',
      showWarnings: false,
      // No tags at all: a phone writes where the clip was filmed into the file.
      tags: {},
      audio: { discard: true },
      video:
        plan.action === 'copy' || !plan.target
          ? {}
          : {
              width: plan.target.width,
              height: plan.target.height,
              fit: 'fill',
              codec: 'avc',
              frameRate: plan.fps && plan.fps > MAX_FPS + 0.5 ? MAX_FPS : undefined,
              quality: new mb.Quality({ bitrate: bitrateFor(plan.target), bitrateMode: 'variable' }),
              forceTranscode: true,
            },
    });
    if (!conversion.isValid) return null;

    const left = remainingTime();
    conversion.onProgress = (progress) =>
      onProgress({ step: 'compressing', progress, secondsLeft: left(progress) });
    const cancel = () => void conversion.cancel();
    signal?.addEventListener('abort', cancel);
    try {
      onProgress({ step: 'compressing', progress: 0, secondsLeft: null });
      await conversion.execute();
    } catch (err) {
      if (signal?.aborted) throw new UploadCancelled();
      // An encoder that failed partway on this device. ffmpeg is slower but does not depend on it.
      console.warn('Browser video conversion failed; falling back to ffmpeg', err);
      return null;
    } finally {
      signal?.removeEventListener('abort', cancel);
    }
    return output.target.buffer;
  } finally {
    input.dispose();
  }
}

function ffmpegArgs(plan: VideoPlan): string[] {
  const target = plan.target;
  // When the size was not known ahead of time, the same bound as an ffmpeg expression.
  const fit = `min(1,${SHORT_SIDE}/min(iw,ih),${LONG_SIDE}/max(iw,ih))`;
  const scale = target
    ? `scale=${target.width}:${target.height}`
    : `scale='trunc(iw*${fit}/2)*2':'trunc(ih*${fit}/2)*2'`;
  // The same ceiling encode-demos.sh uses: 2 Mbit/s peaks for 720p.
  const maxrate = Math.round((bitrateFor(target) * 4) / 3);
  return [
    '-map', '0:v:0',
    '-vf', scale,
    '-fpsmax', String(MAX_FPS),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-maxrate', String(maxrate), '-bufsize', String(maxrate * 2),
    '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-an', '-sn', '-dn',
    '-map_metadata', '-1', '-map_chapters', '-1',
    '-movflags', '+faststart',
    '-f', 'mp4',
  ];
}

/**
 * Runs in a worker so the page stays responsive through a conversion that can
 * take minutes. Written out as source rather than bundled, because the core is
 * a classic script that has to be loaded with importScripts.
 */
const FFMPEG_WORKER = `
async function fetchWasm(url, expectedBytes) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error('HTTP ' + response.status);
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    self.postMessage({ type: 'loading', progress: Math.min(1, received / expectedBytes) });
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}

self.onmessage = async ({ data }) => {
  let stage = 'load';
  try {
    importScripts(data.coreURL);
    const core = await createFFmpegCore({ wasmBinary: await fetchWasm(data.wasmURL, data.wasmBytes) });
    stage = 'convert';
    const log = [];
    core.setLogger(({ message }) => {
      log.push(message);
      if (log.length > 30) log.shift();
    });
    core.setProgress(({ progress, time }) => self.postMessage({ type: 'progress', progress, time }));
    core.FS.mkdir('/in');
    core.FS.mount(core.FS.filesystems.WORKERFS, { blobs: [{ name: 'source', data: data.file }] }, '/in');
    const code = core.exec('-i', '/in/source', ...data.args, '/out.mp4');
    if (code !== 0) {
      self.postMessage({ type: 'error', stage, detail: log.join('\\n') });
      return;
    }
    const out = core.FS.readFile('/out.mp4');
    self.postMessage({ type: 'done', buffer: out.buffer }, [out.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', stage, detail: String((err && err.message) || err) });
  }
};
`;

type WorkerMessage =
  | { type: 'loading'; progress: number }
  | { type: 'progress'; progress: number; time: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; stage: 'load' | 'convert'; detail: string };

function convertWithFfmpeg(
  file: File,
  plan: VideoPlan,
  onProgress: (progress: PrepProgress) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  if (signal?.aborted) return Promise.reject(new UploadCancelled());
  const url = URL.createObjectURL(new Blob([FFMPEG_WORKER], { type: 'text/javascript' }));
  const worker = new Worker(url);

  return new Promise((resolve, reject) => {
    let left: ((progress: number) => number | null) | null = null;
    const finish = (outcome: () => void) => {
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      URL.revokeObjectURL(url);
      outcome();
    };
    const cancel = () => finish(() => reject(new UploadCancelled()));
    signal?.addEventListener('abort', cancel);

    worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
      switch (data.type) {
        case 'loading':
          onProgress({ step: 'loading', progress: data.progress });
          break;
        case 'progress': {
          // The core's own ratio can run past 1 or dip below 0 around the ends.
          const ratio = plan.durationSec ? data.time / 1e6 / plan.durationSec : data.progress;
          const progress = Math.min(1, Math.max(0, ratio));
          left = left ?? remainingTime();
          onProgress({ step: 'compressing', progress, secondsLeft: left(progress) });
          break;
        }
        case 'done':
          finish(() => resolve(data.buffer));
          break;
        case 'error':
          console.warn(`ffmpeg ${data.stage} failed:\n${data.detail}`);
          finish(() =>
            reject(
              new Error(
                data.stage === 'load'
                  ? 'The video converter could not be downloaded. Check your connection and try again.'
                  : 'This video could not be converted. Try exporting it from your phone as an MP4 and upload that.'
              )
            )
          );
          break;
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      console.warn('ffmpeg worker crashed', event.message);
      finish(() => reject(new Error('The video converter stopped unexpectedly. Please try again.')));
    };

    worker.postMessage({
      coreURL: FFMPEG_CORE_URL,
      wasmURL: FFMPEG_WASM_URL,
      wasmBytes: FFMPEG_WASM_BYTES,
      file,
      args: ffmpegArgs(plan),
    });
  });
}
