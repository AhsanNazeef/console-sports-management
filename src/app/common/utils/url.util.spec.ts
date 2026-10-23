import { isWebUrl } from './url.util';

describe('isWebUrl', () => {
  it('accepts absolute http and https links only', () => {
    expect(isWebUrl('https://cdn.example.com/football.png')).toBe(true);
    expect(isWebUrl('http://example.com/a.svg')).toBe(true);
    expect(isWebUrl('example.com/a.png')).toBe(false);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('')).toBe(false);
  });
});
