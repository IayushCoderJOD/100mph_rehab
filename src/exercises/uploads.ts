import { Platform } from 'react-native';
import { UploadTicket, adminApi } from '@/api';
import { Exercise } from '@/data';

/** Matches the API's app.media.max-video-mb. */
export const MAX_VIDEO_MB = 150;

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** For the file input's accept attribute. */
export const VIDEO_ACCEPT = [...VIDEO_TYPES, '.mp4', '.mov', '.webm'].join(',');

/** Uploads run from the website; the phone apps send admins there. */
export const canUploadHere = Platform.OS === 'web';

export type UploadStage =
  | { step: 'checking' }
  | { step: 'uploading'; progress: number }
  | { step: 'saving' };

export class UploadCancelled extends Error {
  constructor() {
    super('Upload cancelled.');
  }
}

/** Some browsers leave File.type empty; the extension is the next best thing. */
function videoType(file: File): string | null {
  if (VIDEO_TYPES.includes(file.type)) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  return null;
}

type VideoCheck = { durationSec: number; poster: Blob | null };

/**
 * Plays the file once, off screen, before anything is uploaded.
 *
 * If this browser cannot decode it, members' phones may not either — the
 * usual culprit is an iPhone's HEVC .mov — and it is far better to say so now
 * than after a 100 MB upload. The same pass grabs a frame a second in (the
 * first is often black) to use as the poster members see before they tap play.
 */
function inspectVideo(file: File): Promise<VideoCheck> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const finish = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      outcome();
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    const unreadable = () =>
      finish(() =>
        reject(
          new Error(
            "This video can't be played in a browser, so members may not be able to watch it. " +
              'Export it as MP4 (H.264) — sending it to yourself on WhatsApp does this — and try again.'
          )
        )
      );
    const timer = setTimeout(unreadable, 30000);

    video.onerror = unreadable;
    video.onloadedmetadata = () => {
      if (!video.videoWidth || !video.videoHeight) {
        unreadable();
        return;
      }
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = duration > 0 ? Math.min(1, duration / 3) : 0.1;
    };
    video.onseeked = () => {
      const scale = Math.min(1, 1280 / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
      canvas.toBlob((poster) => finish(() => resolve({ durationSec, poster })), 'image/jpeg', 0.82);
    };

    video.src = url;
  });
}

/**
 * PUTs a file to the URL the API signed. XMLHttpRequest rather than fetch,
 * because only XHR reports upload progress — and a bar that sits at zero for
 * a minute reads as broken.
 */
function putFile(
  ticket: UploadTicket,
  body: Blob,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadCancelled());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.upload_url);
    Object.entries(ticket.headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage refused the upload (${xhr.status}). Please try again.`));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          'The upload could not reach storage. Check your connection and try again — if it keeps ' +
            "failing, the storage bucket's upload settings (CORS) need checking."
        )
      );
    xhr.onabort = () => reject(new UploadCancelled());
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(body);
  });
}

/** Type and size, before anything is read. Throws with a message for the admin. */
function requireAcceptable(file: File): string {
  const contentType = videoType(file);
  if (!contentType) throw new Error('Choose a video file — MP4 works everywhere.');
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`That video is ${Math.round(file.size / 1024 / 1024)} MB. The limit is ${MAX_VIDEO_MB} MB.`);
  }
  return contentType;
}

/**
 * Checks a file the moment it is chosen, so a video members could not play is
 * turned away before the admin fills in the rest of the form. Resolves with
 * the length in seconds.
 */
export async function checkVideoFile(file: File): Promise<number> {
  if (!canUploadHere) throw new Error('Upload videos from the website.');
  requireAcceptable(file);
  return (await inspectVideo(file)).durationSec;
}

/**
 * Checks, uploads and attaches a demonstration video, reporting each stage.
 * Resolves with the exercise as the API now has it.
 */
export async function uploadExerciseVideo(
  exerciseId: string,
  file: File,
  onStage: (stage: UploadStage) => void,
  signal?: AbortSignal
): Promise<Exercise> {
  if (!canUploadHere) throw new Error('Upload videos from the website.');
  const contentType = requireAcceptable(file);

  onStage({ step: 'checking' });
  const check = await inspectVideo(file);
  if (signal?.aborted) throw new UploadCancelled();

  const ticket = await adminApi.requestUpload('video', contentType, file.size, file.name);
  onStage({ step: 'uploading', progress: 0 });
  await putFile(ticket, file, (progress) => onStage({ step: 'uploading', progress }), signal);

  // The poster is a nicety. If it fails, the video still goes live.
  let posterKey: string | undefined;
  if (check.poster) {
    try {
      const posterTicket = await adminApi.requestUpload('poster', 'image/jpeg', check.poster.size, file.name);
      await putFile(posterTicket, check.poster, undefined, signal);
      posterKey = posterTicket.key;
    } catch (err) {
      if (err instanceof UploadCancelled) throw err;
    }
  }

  onStage({ step: 'saving' });
  return adminApi.updateExercise(exerciseId, {
    video_key: ticket.key,
    ...(posterKey ? { thumbnail_key: posterKey } : {}),
  });
}
