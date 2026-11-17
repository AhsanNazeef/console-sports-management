import { HttpErrorResponse } from '@angular/common/http';
import { FORBIDDEN_CHANGE_MESSAGE, FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../constants/http.constants';
import { ApiErrorBody } from '../models/api.model';

// A short, user-facing message for a failed request. Callers handle statuses with a specific meaning first.
export function describeHttpError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (error.status === 403) {
    return FORBIDDEN_CHANGE_MESSAGE;
  }
  if (error.status === 429) {
    return RATE_LIMITED_MESSAGE;
  }
  if (error.status === 400) {
    const body = (error.error as ApiErrorBody | null)?.error;
    const firstDetail = Object.values(body?.details ?? {}).flat()[0];
    return firstDetail ?? body?.message ?? fallback;
  }
  return fallback;
}

// The HTTP status of a failed request, or null when the failure is not an HTTP one.
export function httpStatusOf(error: unknown): number | null {
  return error instanceof HttpErrorResponse ? error.status : null;
}

// The text for a failed load: why, when the backend refused (403) or rate-limited (429) it; otherwise the fallback.
export function describeLoadError(status: number | null, fallback: string): string {
  if (status === 403) {
    return FORBIDDEN_LOAD_MESSAGE;
  }
  if (status === 429) {
    return RATE_LIMITED_MESSAGE;
  }
  return fallback;
}
