import { strings } from '@/i18n/strings';

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

/**
 * User-facing copy, keyed by the server's stable code, in the language the app
 * is showing. The wording itself lives with the rest of the app's copy in
 * src/i18n.
 */
export function messageFor(error: unknown): string {
  const messages = strings().errors;
  if (error instanceof ApiError) {
    return messages[error.code] ?? messages.internal_error;
  }
  return messages.internal_error;
}
