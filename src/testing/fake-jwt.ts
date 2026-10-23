// Test helper: an unsigned JWT that expires `secondsFromNow` after the current (possibly faked) time.
export function fakeJwt(secondsFromNow: number, claims: object = {}): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...claims, exp })}.signature`;
}
