import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { fakeJwt } from '../../../../testing/fake-jwt';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_EXPIRED_MESSAGE,
  SKIP_SESSION_EXPIRY,
} from '../../../auth/constants/auth.constants';
import { AuthService } from './auth.service';

const USER = { id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' };
const stored = (key: string): unknown => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.value ?? null;

describe('AuthService', () => {
  let http: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  function createService(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('logs in against the environment API and keeps the tokens in sessionStorage', async () => {
    const auth = createService();
    const accessToken = fakeJwt(900);
    const user = firstValueFrom(auth.login$('admin@buzzer.dev', 'secret'));

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'admin@buzzer.dev', password: 'secret' });
    expect(request.request.context.get(SKIP_SESSION_EXPIRY)).toBe(true);
    request.flush({ success: true, data: { accessToken, refreshToken: 'refresh', user: USER } });

    expect(await user).toEqual(USER);
    expect(stored(ACCESS_TOKEN_KEY)).toBe(accessToken);
    expect(stored(REFRESH_TOKEN_KEY)).toBe('refresh');
    expect(auth.currentUser()).toEqual(USER);
    expect(auth.hasSession()).toBe(true);
  });

  it('loads the current user from /auth/me', async () => {
    const auth = createService();
    const user = firstValueFrom(auth.loadCurrentUser$());
    http.expectOne(`${environment.apiBaseUrl}/auth/me`).flush({ success: true, data: USER });
    expect(await user).toEqual(USER);
    expect(auth.currentUser()).toEqual(USER);
  });

  it('treats an expired stored token as no session and explains why', () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(-10) }));
    const auth = createService();
    expect(auth.hasSession()).toBe(false);
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(auth.consumeMessage()).toBe(SESSION_EXPIRED_MESSAGE);
    expect(auth.consumeMessage()).toBeNull();
  });

  it('signs out: revokes the refresh token, clears the session and goes to login', () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(900) }));
    sessionStorage.setItem(REFRESH_TOKEN_KEY, JSON.stringify({ value: 'refresh' }));
    const auth = createService();
    auth.signOut();

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(request.request.body).toEqual({ refreshToken: 'refresh' });
    request.flush({ success: true });
    expect(auth.hasSession()).toBe(false);
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('ends the session and returns to login when the token expires', async () => {
    vi.useFakeTimers();
    const auth = createService();
    const login = firstValueFrom(auth.login$('admin@buzzer.dev', 'secret'));
    http
      .expectOne(`${environment.apiBaseUrl}/auth/login`)
      .flush({ success: true, data: { accessToken: fakeJwt(60), refreshToken: 'refresh', user: USER } });
    await login;

    vi.advanceTimersByTime(59_000);
    expect(auth.hasSession()).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(auth.consumeMessage()).toBe(SESSION_EXPIRED_MESSAGE);
    expect(navigateByUrl).toHaveBeenCalled();
  });

  it('returns to the address shown in the bar, not a drill-down route reached without changing it', () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(900) }));
    const auth = createService();
    vi.spyOn(TestBed.inject(Location), 'path').mockReturnValue('/sports');
    auth.expireSession();
    expect(String(navigateByUrl.mock.calls[0][0])).toBe('/login?returnUrl=%2Fsports');
  });

  it('checks the signed-in user against a list of roles', () => {
    const auth = createService();
    expect(auth.hasAnyRole(['ADMIN'])).toBe(false);
    auth.currentUser.set({ ...USER, role: 'OPERATOR' });
    expect(auth.hasAnyRole(['ADMIN', 'OPERATOR'])).toBe(true);
    expect(auth.hasAnyRole(['ADMIN'])).toBe(false);
  });

  it('builds the login address with a return path, except for the home page', () => {
    const auth = createService();
    expect(auth.loginUrlTree('/sports').toString()).toBe('/login?returnUrl=%2Fsports');
    expect(auth.loginUrlTree('/').toString()).toBe('/login');
    expect(auth.loginUrlTree('/dashboard').toString()).toBe('/login');
  });
});
