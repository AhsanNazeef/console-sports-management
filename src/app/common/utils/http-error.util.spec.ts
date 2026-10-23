import { HttpErrorResponse } from '@angular/common/http';
import { describeHttpError } from './http-error.util';

describe('describeHttpError', () => {
  const fail = (status: number, error: unknown = null): HttpErrorResponse => new HttpErrorResponse({ status, error });

  it('explains connection problems and missing permissions', () => {
    expect(describeHttpError(fail(0), 'x')).toContain("Couldn't reach the server");
    expect(describeHttpError(fail(403), 'x')).toBe("Your role isn't allowed to make this change.");
  });

  it('uses the first validation detail from the backend', () => {
    const body = { success: false, error: { message: 'Validation failed', details: { iconUrl: ['Invalid url'] } } };
    expect(describeHttpError(fail(400, body), 'x')).toBe('Invalid url');
  });

  it('falls back for anything else', () => {
    expect(describeHttpError(fail(500), 'Something went wrong.')).toBe('Something went wrong.');
    expect(describeHttpError(new Error('boom'), 'Something went wrong.')).toBe('Something went wrong.');
  });
});
