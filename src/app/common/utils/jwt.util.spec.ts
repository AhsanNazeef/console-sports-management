import { fakeJwt } from '../../../testing/fake-jwt';
import { getTokenExpiry } from './jwt.util';

describe('getTokenExpiry', () => {
  it('returns the exp claim in milliseconds', () => {
    const token = fakeJwt(60);
    const expected = (Math.floor(Date.now() / 1000) + 60) * 1000;
    expect(getTokenExpiry(token)).toBe(expected);
  });

  it('returns null for a token without exp or with a broken payload', () => {
    expect(getTokenExpiry(`${btoa('{}')}.${btoa('{"sub":"x"}')}.sig`)).toBeNull();
    expect(getTokenExpiry('abc.%%%.def')).toBeNull();
    expect(getTokenExpiry('not-a-jwt')).toBeNull();
  });
});
