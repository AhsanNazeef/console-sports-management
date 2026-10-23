import { HttpErrorResponse } from '@angular/common/http';
import { describeHttpError } from '../../common/utils/http-error.util';

// The record behind a detail page doesn't exist: deleted (404) or a mistyped id in the address (400).
export function isMissing(status: number | null): boolean {
  return status === 404 || status === 400;
}

export function describeCreateError(error: unknown, kind: string, name: string): string {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return `A ${kind} called “${name}” already exists here. Try another name.`;
  }
  return describeHttpError(error, `Couldn't add the ${kind}. Please try again.`);
}
