import { HttpErrorResponse } from '@angular/common/http';
import { describeCreateError, isMissing } from './hierarchy-errors.util';

describe('hierarchy errors', () => {
  it('treats 404 and 400 as a missing record', () => {
    expect(isMissing(404)).toBe(true);
    expect(isMissing(400)).toBe(true);
    expect(isMissing(500)).toBe(false);
    expect(isMissing(null)).toBe(false);
  });

  it('explains a duplicate name, and falls back to the general message', () => {
    expect(describeCreateError(new HttpErrorResponse({ status: 409 }), 'governing body', 'UEFA')).toBe(
      'A governing body called “UEFA” already exists here. Try another name.'
    );
    expect(describeCreateError(new HttpErrorResponse({ status: 500 }), 'organisation', 'X')).toBe(
      "Couldn't add the organisation. Please try again."
    );
  });
});
