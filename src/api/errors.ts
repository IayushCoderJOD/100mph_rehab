/**
 * The server speaks one error envelope (backend README §7.1):
 *   { "error": { "code", "message", "details", "request_id" } }
 *
 * `code` is the stable contract; `message` is written for logs. The client
 * maps codes to copy here, so server wording never leaks into the UI.
 */
export type ApiErrorCode =
  | 'invalid_credentials'
  | 'account_suspended'
  | 'token_missing'
  | 'token_invalid'
  | 'token_expired'
  | 'refresh_token_invalid'
  | 'refresh_token_reused'
  | 'too_many_attempts'
  | 'email_already_exists'
  | 'phone_already_exists'
  | 'password_too_weak'
  | 'current_password_incorrect'
  | 'reset_token_invalid'
  | 'program_not_found'
  | 'exercise_not_found'
  | 'schedule_invalid_day'
  | 'already_assigned'
  | 'unsupported_media'
  | 'upload_not_found'
  | 'media_not_configured'
  | 'validation_failed'
  | 'malformed_request'
  | 'forbidden'
  | 'not_found'
  | 'internal_error'
  | 'network_error';

export class ApiError extends Error {
  readonly code: ApiErrorCode | string;
  readonly status: number;
  readonly details: Record<string, unknown>;
  readonly requestId: string | null;

  constructor(
    code: string,
    message: string,
    status: number,
    details: Record<string, unknown> = {},
    requestId: string | null = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  /** True when retrying later might work — the connection, not the request. */
  get isNetworkError() {
    return this.code === 'network_error';
  }
}

/** User-facing copy, keyed by the server's stable code. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email and password do not match an account.',
  account_suspended: 'This account has been suspended. Please contact your coach.',
  too_many_attempts: 'Too many attempts. Please wait a few minutes and try again.',
  email_already_exists: 'An account with that email already exists.',
  phone_already_exists: 'An account with that phone number already exists.',
  password_too_weak: 'Passwords need at least 8 characters.',
  current_password_incorrect: 'Your current password is not right.',
  reset_token_invalid: 'That reset link is invalid or has expired.',
  program_not_found: 'That program no longer exists.',
  exercise_not_found: 'One of those exercises is no longer in the catalogue.',
  schedule_invalid_day: 'One of the days in that week is not valid.',
  already_assigned: 'That exercise is already assigned to this client.',
  unsupported_media: 'That file cannot be used. Upload an MP4 video of up to 150 MB.',
  upload_not_found: 'The upload did not finish. Please try again.',
  media_not_configured: 'Video uploads are not set up on the server yet.',
  validation_failed: 'Please check the details and try again.',
  forbidden: 'You do not have access to that.',
  not_found: 'We could not find that.',
  network_error: 'Cannot reach the server. Check your connection and try again.',
  internal_error: 'Something went wrong at our end. Please try again.',
};

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? MESSAGES.internal_error;
  }
  return MESSAGES.internal_error;
}
