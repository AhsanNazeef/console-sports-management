import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { demoUser, ROLE_PERMISSIONS } from '../../../../testing/auth.fixtures';
import { fakeJwt } from '../../../../testing/fake-jwt';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_CHECK_FAILED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from '../../../auth/constants/auth.constants';
import { RATE_LIMITED_MESSAGE } from '../../../common/constants/http.constants';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { homeGuard } from './home.guard';

@Component({ template: '' })
class BlankPage {}

const API = environment.apiBaseUrl;
const USER = demoUser('ADMIN');

describe('auth guards', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', canActivate: [homeGuard], component: BlankPage },
          { path: 'dashboard', canActivate: [authGuard], component: BlankPage },
          { path: 'sports', canActivate: [authGuard], component: BlankPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sessionStorage.clear();
    http.verify();
  });

  const signIn = (): void => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(900) }));
    sessionStorage.setItem(REFRESH_TOKEN_KEY, JSON.stringify({ value: 'refresh' }));
  };
  const url = (): string => TestBed.inject(Router).url;
  // The guard asks for the user after the navigation starts, so wait for the request to appear.
  const meRequest = (): Promise<TestRequest> => vi.waitFor(() => http.expectOne(`${API}/auth/me`));
  // After the user, the guard waits for their permission list.
  const permissionsRequest = (): Promise<TestRequest> =>
    vi.waitFor(() => http.expectOne(`${API}/users/${USER.id}/permissions`));
  const answerPermissions = async (): Promise<void> =>
    (await permissionsRequest()).flush({
      success: true,
      data: { userId: USER.id, role: USER.role, permissions: [...ROLE_PERMISSIONS.ADMIN] },
    });
  const failMe = async (status: number, statusText: string): Promise<void> =>
    (await meRequest()).flush({ success: false, error: { message: statusText } }, { status, statusText });

  it('sends visitors without a session to login, remembering the page', async () => {
    await RouterTestingHarness.create('/sports');
    expect(url()).toBe('/login?returnUrl=%2Fsports');
  });

  it('loads the user from /auth/me before letting a session in', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    (await meRequest()).flush({ success: true, data: USER });
    await answerPermissions();
    await navigation;
    expect(url()).toBe('/sports');
    expect(TestBed.inject(AuthService).currentUser()).toEqual(USER);
  });

  it('holds the navigation until the permission list answers', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    let finished = false;
    const navigation = harness.navigateByUrl('/sports').then(() => (finished = true));
    (await meRequest()).flush({ success: true, data: USER });
    const permissions = await permissionsRequest();
    await new Promise((resolve) => setTimeout(resolve));
    expect(finished).toBe(false);
    expect(url()).toBe('/');

    permissions.flush({ success: true, data: { userId: USER.id, role: USER.role, permissions: ['matches:write'] } });
    await navigation;
    expect(url()).toBe('/sports');
    expect(TestBed.inject(AuthService).can('manageMatches')).toBe(true);
  });

  it('checks the session again when a new navigation replaces one waiting for the permission list', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const first = harness.navigateByUrl('/sports');
    (await meRequest()).flush({ success: true, data: USER });
    const abandoned = await permissionsRequest();

    const second = harness.navigateByUrl('/dashboard');
    const me = await meRequest();
    expect(abandoned.cancelled).toBe(true);
    me.flush({ success: true, data: USER });
    await answerPermissions();
    await Promise.all([first, second]);

    expect(url()).toBe('/dashboard');
    const authService = TestBed.inject(AuthService);
    expect(authService.currentUser()).toEqual(USER);
    expect(authService.can('manageMatches')).toBe(true);
  });

  it('ends a session the backend rejects', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    await failMe(401, 'Unauthorized');
    await navigation;
    expect(url()).toBe('/login?returnUrl=%2Fsports');
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(TestBed.inject(AuthService).consumeMessage()).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it('ends the session and explains the wait when the session check is rate-limited', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    await failMe(429, 'Too Many Requests');
    await navigation;
    expect(url()).toBe('/login?returnUrl=%2Fsports');
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(TestBed.inject(AuthService).consumeMessage()).toBe(RATE_LIMITED_MESSAGE);
  });

  it('asks to log in again when the session check fails for another reason', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    await failMe(500, 'Internal Server Error');
    await navigation;
    expect(url()).toBe('/login?returnUrl=%2Fsports');
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(TestBed.inject(AuthService).consumeMessage()).toBe(SESSION_CHECK_FAILED_MESSAGE);
  });

  it('keeps signed-in users off the login page', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login');
    (await meRequest()).flush({ success: true, data: USER });
    await answerPermissions();
    await navigation;
    expect(url()).toBe('/dashboard');
  });
});
