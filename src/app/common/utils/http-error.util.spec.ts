import { HttpErrorResponse } from '@angular/common/http';
import { FORBIDDEN_CHANGE_MESSAGE, FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../constants/http.constants';
import { describeHttpError, describeLoadError, httpStatusOf } from './http-error.util';

describe('describeHttpError', () => {
  const fail = (status: number, error: unknown = null): HttpErrorResponse => new HttpErrorResponse({ status, error });

  it('explains connection problems and missing permissions', () => {
    expect(describeHttpError(fail(0), 'x')).toContain("Couldn't reach the server");
    expect(describeHttpError(fail(403), 'x')).toBe(FORBIDDEN_CHANGE_MESSAGE);
  });

  it('asks to wait and try again after the rate limit', () => {
    expect(describeHttpError(fail(429), 'x')).toBe(RATE_LIMITED_MESSAGE);
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

describe('describeLoadError', () => {
  it('says why a refused or rate-limited load failed', () => {
    expect(describeLoadError(403, 'x')).toBe(FORBIDDEN_LOAD_MESSAGE);
    expect(describeLoadError(429, 'x')).toBe(RATE_LIMITED_MESSAGE);
  });

  it('falls back for anything else', () => {
    expect(describeLoadError(500, "Couldn't load the sports.")).toBe("Couldn't load the sports.");
    expect(describeLoadError(0, "Couldn't load the sports.")).toBe("Couldn't load the sports.");
  });
});

describe('httpStatusOf', () => {
  it('gives the status of an HTTP failure, and null for anything else', () => {
    expect(httpStatusOf(new HttpErrorResponse({ status: 429 }))).toBe(429);
    expect(httpStatusOf(new HttpErrorResponse({ status: 0 }))).toBe(0);
    expect(httpStatusOf(new Error('boom'))).toBeNull();
    expect(httpStatusOf(null)).toBeNull();
  });
});
