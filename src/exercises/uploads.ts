import { Platform } from 'react-native';
import { UploadTicket, adminApi } from '@/api';
import { Exercise } from '@/data';
import { PrepProgress, UploadCancelled, VideoPlan, planVideo, prepareVideo } from './videoPrep';

export { MAX_SOURCE_MINUTES, UploadCancelled } from './videoPrep';
export type { VideoPlan } from './videoPrep';

/** Matches the API's app.media.max-video-mb. It is the file that is sent that counts, after compression. */
export const MAX_VIDEO_MB = 150;

/** Anything a phone or camera records. It is converted before it is sent. */
export const VIDEO_ACCEPT = 'video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.3gp';

/** Uploads run from the website; the phone apps send admins there. */
export const canUploadHere = Platform.OS === 'web';

export type UploadStage =
  | { step: 'checking' }
  | PrepProgress
  | { step: 'uploading'; progress: number }
  | { step: 'saving' };

export type UploadResult = {
  exercise: Exercise;
  /** The size of the MP4 that was sent. */
  sentBytes: number;
  compressed: boolean;
};

/** Some browsers leave File.type empty; the extension is the next best thing. */
function requireVideo(file: File): void {
  if (file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i.test(file.name)) return;
  throw new Error('Choose a video file.');
}

type VideoCheck = { poster: Blob | null };

/**
 * Plays the converted file once, off screen, before anything is uploaded — the
 * last check that what members get actually plays. The same pass grabs a frame
 * a second in (the first is often black) to use as the poster members see
 * before they tap play.
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
            'The converted video would not play back, so it was not uploaded. ' +
              'Try exporting it from your phone as an MP4 and upload that.'
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
      canvas.toBlob((poster) => finish(() => resolve({ poster })), 'image/jpeg', 0.82);
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

/** A phone that locks its screen mid-conversion suspends the page. Best effort: not every browser has wake locks. */
async function keepScreenOn(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    return () => void lock?.release().catch(() => undefined);
  } catch {
    return () => undefined;
  }
}

/**
 * Reads a file the moment it is chosen and works out what will happen to it,
 * so a file that is not a usable video is turned away before the admin fills
 * in the rest of the form.
 */
export async function checkVideoFile(file: File): Promise<VideoPlan> {
  if (!canUploadHere) throw new Error('Upload videos from the website.');
  requireVideo(file);
  return planVideo(file);
}

/**
 * Converts, checks, uploads and attaches a demonstration video, reporting each
 * stage. Resolves with the exercise as the API now has it.
 *
 * Replacing is the same call. The exercise keeps its current video until the
 * new file has fully landed and the API has checked it, so a failed or
 * cancelled upload leaves members exactly where they were.
 */
export async function uploadExerciseVideo(
  exerciseId: string,
  file: File,
  onStage: (stage: UploadStage) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  if (!canUploadHere) throw new Error('Upload videos from the website.');
  requireVideo(file);

  const release = await keepScreenOn();
  try {
    onStage({ step: 'checking' });
    const plan = await planVideo(file);
    const video = await prepareVideo(file, plan, onStage, signal);
    if (video.size > MAX_VIDEO_MB * 1024 * 1024) {
      throw new Error(
        `Even compressed, this video is ${Math.round(video.size / 1024 / 1024)} MB — the limit is ${MAX_VIDEO_MB} MB. ` +
          'Trim it to just the exercise and try again.'
      );
    }

    onStage({ step: 'checking' });
    const check = await inspectVideo(video);
    if (signal?.aborted) throw new UploadCancelled();

    const ticket = await adminApi.requestUpload('video', video.type, video.size, video.name);
    onStage({ step: 'uploading', progress: 0 });
    await putFile(ticket, video, (progress) => onStage({ step: 'uploading', progress }), signal);

    // The poster is a nicety. If it fails, the video still goes live.
    let posterKey: string | undefined;
    if (check.poster) {
      try {
        const posterTicket = await adminApi.requestUpload('poster', 'image/jpeg', check.poster.size, video.name);
        await putFile(posterTicket, check.poster, undefined, signal);
        posterKey = posterTicket.key;
      } catch (err) {
        if (err instanceof UploadCancelled) throw err;
      }
    }

    onStage({ step: 'saving' });
    // The video and its poster change together. Replacing a video whose new
    // frame could not be captured clears the old poster rather than leaving a
    // still from the previous clip in front of the new one.
    const exercise = await adminApi.updateExercise(exerciseId, {
      video_key: ticket.key,
      thumbnail_key: posterKey ?? '',
    });
    return { exercise, sentBytes: video.size, compressed: plan.action === 'compress' };
  } finally {
    release();
  }
}
