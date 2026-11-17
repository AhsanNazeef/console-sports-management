import { Location } from '@angular/common';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ACTIONS, demoUser, ROLE_PERMISSIONS } from '../../../../testing/auth.fixtures';
import { fakeJwt } from '../../../../testing/fake-jwt';
import { AccessAction } from '../../../auth/constants/access.constants';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_EXPIRED_MESSAGE,
  SKIP_SESSION_EXPIRY,
} from '../../../auth/constants/auth.constants';
import { Permission, UserRole } from '../../../auth/models/auth.model';
import { FORBIDDEN_MESSAGE, SKIP_HTTP_NOTICE } from '../../../common/constants/http.constants';
import { HttpNoticeService } from '../../../common/services/http-notice.service';
import { AccessContext } from '../utils/access.util';
import { AuthService } from './auth.service';

const API = environment.apiBaseUrl;
const ADMIN = demoUser('ADMIN');
const OWN_CLUB = 'club-own';
const stored = (key: string): unknown => JSON.parse(sessionStorage.getItem(key) ?? 'null')?.value ?? null;
const errorBody = (message: string): object => ({ success: false, error: { message } });

// Resolves with the stream's error, or fails the test if the stream succeeds.
function failureOf(stream: Observable<unknown>): Promise<unknown> {
  return firstValueFrom(stream).then(
    () => {
      throw new Error('Expected the stream to fail');
    },
    (error: unknown) => error
  );
}

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

  const allowedActions = (auth: AuthService, context?: AccessContext): AccessAction[] =>
    ACTIONS.filter((action) => auth.can(action, context));

  const meRequest = (): TestRequest => http.expectOne(`${API}/auth/me`);
  const permissionsRequest = (role: UserRole): TestRequest =>
    http.expectOne(`${API}/users/${demoUser(role).id}/permissions`);
  const organisationRequest = (): TestRequest => http.expectOne(`${API}/organization`);

  function answerPermissions(role: UserRole, permissions: readonly Permission[] = ROLE_PERMISSIONS[role]): void {
    permissionsRequest(role).flush({
      success: true,
      data: { userId: demoUser(role).id, role, permissions: [...permissions] },
    });
  }

  function answerOrganisation(id = OWN_CLUB): void {
    organisationRequest().flush({ success: true, data: { id, name: 'Own Club FC' } });
  }

  // Loads the account through GET /auth/me; an ORG account is linked to OWN_CLUB.
  async function signInAs(auth: AuthService, role: UserRole): Promise<void> {
    const user = firstValueFrom(auth.loadCurrentUser$());
    meRequest().flush({ success: true, data: demoUser(role) });
    answerPermissions(role);
    if (role === 'ORG') {
      answerOrganisation();
    }
    await user;
  }

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    http.verify();
  });

  it('logs in, keeps the tokens, then reads the user from /auth/me and their access before resolving', async () => {
    const auth = createService();
    const accessToken = fakeJwt(900);
    const user = firstValueFrom(auth.login$('admin@buzzer.dev', 'secret'));

    const login = http.expectOne(`${API}/auth/login`);
    expect(login.request.method).toBe('POST');
    expect(login.request.body).toEqual({ email: 'admin@buzzer.dev', password: 'secret' });
    // The role comes from /auth/me, as on a page load, not from the login answer.
    login.flush({ success: true, data: { accessToken, refreshToken: 'refresh', user: { ...ADMIN, role: 'VIEWER' } } });
    expect(stored(ACCESS_TOKEN_KEY)).toBe(accessToken);
    expect(stored(REFRESH_TOKEN_KEY)).toBe('refresh');

    meRequest().flush({ success: true, data: ADMIN });
    expect(auth.currentUser()).toBeNull();
    answerPermissions('ADMIN');

    expect(await user).toEqual(ADMIN);
    expect(auth.currentUser()).toEqual(ADMIN);
    expect(allowedActions(auth)).toEqual(ACTIONS);
    expect(auth.hasSession()).toBe(true);
  });

  it('keeps no session when /auth/me fails after login, and passes the error on', async () => {
    const auth = createService();
    const failure = failureOf(auth.login$('admin@buzzer.dev', 'secret'));
    http
      .expectOne(`${API}/auth/login`)
      .flush({ success: true, data: { accessToken: fakeJwt(900), refreshToken: 'refresh', user: ADMIN } });
    expect(stored(ACCESS_TOKEN_KEY)).not.toBeNull();

    meRequest().flush(errorBody('Internal server error'), { status: 500, statusText: 'Server Error' });

    const error = await failure;
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(500);
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(auth.hasSession()).toBe(false);
  });

  it('loads the current user from /auth/me, and sets it only once their access has loaded', async () => {
    const auth = createService();
    const user = firstValueFrom(auth.loadCurrentUser$());
    meRequest().flush({ success: true, data: demoUser('OPERATOR') });
    expect(auth.currentUser()).toBeNull();
    expect(allowedActions(auth)).toEqual([]);

    answerPermissions('OPERATOR');
    expect(await user).toEqual(demoUser('OPERATOR'));
    expect(auth.currentUser()).toEqual(demoUser('OPERATOR'));
    expect(auth.accessError()).toBeNull();
    expect(allowedActions(auth)).toEqual(['viewPayments', 'manageCatalogue', 'manageMatches', 'changePaymentStatus']);
  });

  it('loads an ORG account’s own club and limits squad and staff changes to it', async () => {
    const auth = createService();
    await signInAs(auth, 'ORG');

    expect(auth.can('manageMembers', { organisationId: OWN_CLUB })).toBe(true);
    expect(auth.can('manageMembers', { organisationId: 'another-club' })).toBe(false);
    expect(allowedActions(auth, { organisationId: OWN_CLUB })).toEqual(['manageMembers']);
  });

  it('treats an ORG account the backend refuses a club (403) as linked to none, without an access error', async () => {
    const auth = createService();
    const user = firstValueFrom(auth.loadCurrentUser$());
    meRequest().flush({ success: true, data: demoUser('ORG') });
    answerPermissions('ORG');
    organisationRequest().flush(errorBody('Organization not found for user'), { status: 403, statusText: 'Forbidden' });
    await user;

    expect(auth.currentUser()).toEqual(demoUser('ORG'));
    expect(auth.accessError()).toBeNull();
    expect(auth.can('manageMembers', { organisationId: OWN_CLUB })).toBe(false);
    expect(auth.can('manageMembers')).toBe(false);
  });

  describe('when the access can’t be loaded', () => {
    const cases: { name: string; role: UserRole; failing: 'permissions' | 'organisation'; status: number }[] = [
      { name: 'the permission list fails (500)', role: 'ADMIN', failing: 'permissions', status: 500 },
      { name: 'the permission list is rate-limited (429)', role: 'ADMIN', failing: 'permissions', status: 429 },
      { name: 'an ORG account’s club is rate-limited (429)', role: 'ORG', failing: 'organisation', status: 429 },
      { name: 'an ORG account’s club fails (500)', role: 'ORG', failing: 'organisation', status: 500 },
    ];

    it.each(cases)('signs in but allows nothing and keeps the error when $name', async ({ role, failing, status }) => {
      const auth = createService();
      const user = firstValueFrom(auth.loadCurrentUser$());
      meRequest().flush({ success: true, data: demoUser(role) });
      const failed = { status, statusText: 'Error' };
      if (failing === 'permissions') {
        permissionsRequest(role).flush(errorBody('Request failed'), failed);
      } else {
        answerPermissions(role);
        organisationRequest().flush(errorBody('Request failed'), failed);
      }

      expect(await user).toEqual(demoUser(role));
      expect(auth.currentUser()).toEqual(demoUser(role));
      expect(auth.accessError()?.status).toBe(status);
      expect(allowedActions(auth, { organisationId: OWN_CLUB })).toEqual([]);
      expect(auth.can('changePaymentStatus')).toBe(false);
    });
  });

  it('loads the access again on request, then allows what the account may do and clears the error', async () => {
    const auth = createService();
    const user = firstValueFrom(auth.loadCurrentUser$());
    meRequest().flush({ success: true, data: ADMIN });
    permissionsRequest('ADMIN').flush(errorBody('Too many requests'), { status: 429, statusText: 'Too Many Requests' });
    await user;
    expect(auth.accessError()?.status).toBe(429);

    const reloaded = firstValueFrom(auth.reloadAccess$());
    answerPermissions('ADMIN');
    await reloaded;
    expect(auth.accessError()).toBeNull();
    expect(allowedActions(auth)).toEqual(ACTIONS);
  });

  it('requests nothing when asked to reload the access without a signed-in user', () => {
    const auth = createService();
    let emitted = false;
    auth.reloadAccess$().subscribe(() => (emitted = true));
    expect(emitted).toBe(false);
    http.expectNone(`${API}/users/${ADMIN.id}/permissions`);
  });

  it('passes on a failure that isn’t an HTTP error instead of keeping it as an access error', async () => {
    const auth = createService();
    const failure = failureOf(auth.loadCurrentUser$());
    meRequest().flush({ success: true, data: ADMIN });
    permissionsRequest('ADMIN').flush({ success: true, data: null });

    const error = await failure;
    expect(error).toBeInstanceOf(TypeError);
    expect(auth.accessError()).toBeNull();
    expect(auth.currentUser()).toBeNull();
  });

  it('marks auth requests as handling their own errors, and access requests as showing no console-wide notice', async () => {
    const auth = createService();
    const user = firstValueFrom(auth.login$('org@buzzer.dev', 'secret'));
    const login = http.expectOne(`${API}/auth/login`);
    login.flush({ success: true, data: { accessToken: fakeJwt(900), refreshToken: 'refresh', user: demoUser('ORG') } });
    const me = meRequest();
    me.flush({ success: true, data: demoUser('ORG') });
    const permissions = permissionsRequest('ORG');
    const organisation = organisationRequest();
    permissions.flush({ success: true, data: { userId: demoUser('ORG').id, role: 'ORG', permissions: ['org:write'] } });
    organisation.flush({ success: true, data: { id: OWN_CLUB, name: 'Own Club FC' } });
    await user;
    auth.signOut();
    const logout = http.expectOne(`${API}/auth/logout`);
    logout.flush({ success: true, data: null });

    for (const request of [login, me, logout]) {
      expect(request.request.context.get(SKIP_SESSION_EXPIRY), request.request.url).toBe(true);
      expect(request.request.context.get(SKIP_HTTP_NOTICE), request.request.url).toBe(true);
    }
    for (const request of [permissions, organisation]) {
      expect(request.request.context.get(SKIP_HTTP_NOTICE), request.request.url).toBe(true);
      // A 401 here still ends the session through the interceptor.
      expect(request.request.context.get(SKIP_SESSION_EXPIRY), request.request.url).toBe(false);
    }
  });

  it('ends the session: no user, no access, no access error and no console-wide notice', async () => {
    const auth = createService();
    const notices = TestBed.inject(HttpNoticeService);
    const user = firstValueFrom(auth.loadCurrentUser$());
    meRequest().flush({ success: true, data: ADMIN });
    permissionsRequest('ADMIN').flush(errorBody('Internal server error'), { status: 500, statusText: 'Server Error' });
    await user;
    notices.show(403);
    expect(auth.accessError()).not.toBeNull();
    expect(notices.notice()).toBe(FORBIDDEN_MESSAGE);

    auth.endSession(null);
    expect(auth.currentUser()).toBeNull();
    expect(auth.accessError()).toBeNull();
    expect(notices.notice()).toBeNull();
  });

  it('allows no actions after the session ends, even before the next user’s access loads', async () => {
    const auth = createService();
    await signInAs(auth, 'ADMIN');
    expect(allowedActions(auth)).toEqual(ACTIONS);

    auth.endSession(null);
    expect(allowedActions(auth)).toEqual([]);
    // The access is cleared too, not only the user.
    auth.currentUser.set(ADMIN);
    expect(allowedActions(auth)).toEqual([]);
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

    const request = http.expectOne(`${API}/auth/logout`);
    expect(request.request.body).toEqual({ refreshToken: 'refresh' });
    request.flush({ success: true, data: null });
    expect(auth.hasSession()).toBe(false);
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('ends the session and returns to login when the token expires', async () => {
    vi.useFakeTimers();
    const auth = createService();
    const login = firstValueFrom(auth.login$('admin@buzzer.dev', 'secret'));
    http
      .expectOne(`${API}/auth/login`)
      .flush({ success: true, data: { accessToken: fakeJwt(60), refreshToken: 'refresh', user: ADMIN } });
    meRequest().flush({ success: true, data: ADMIN });
    answerPermissions('ADMIN');
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

  it('builds the login address with a return path, except for the home page', () => {
    const auth = createService();
    expect(auth.loginUrlTree('/sports').toString()).toBe('/login?returnUrl=%2Fsports');
    expect(auth.loginUrlTree('/').toString()).toBe('/login');
    expect(auth.loginUrlTree('/dashboard').toString()).toBe('/login');
  });
});
