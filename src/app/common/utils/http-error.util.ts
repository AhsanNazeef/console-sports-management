import { HttpErrorResponse } from '@angular/common/http';
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
    return "Your role isn't allowed to make this change.";
  }
  if (error.status === 400) {
    const body = (error.error as ApiErrorBody | null)?.error;
    const firstDetail = Object.values(body?.details ?? {}).flat()[0];
    return firstDetail ?? body?.message ?? fallback;
  }
  return fallback;
}
