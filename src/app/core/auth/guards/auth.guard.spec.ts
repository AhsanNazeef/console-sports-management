import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { fakeJwt } from '../../../../testing/fake-jwt';
import {
  ACCESS_TOKEN_KEY,
  SESSION_CHECK_FAILED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { homeGuard } from './home.guard';

@Component({ template: '' })
class BlankPage {}

const USER = { id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' };

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
    http.verify();
    sessionStorage.clear();
  });

  const signIn = (): void => sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(900) }));
  const url = (): string => TestBed.inject(Router).url;
  // The guard asks for the user after the navigation starts, so wait for the request to appear.
  const meRequest = (): Promise<TestRequest> => vi.waitFor(() => http.expectOne(`${environment.apiBaseUrl}/auth/me`));

  it('sends visitors without a session to login, remembering the page', async () => {
    await RouterTestingHarness.create('/sports');
    expect(url()).toBe('/login?returnUrl=%2Fsports');
  });

  it('loads the user from /auth/me before letting a session in', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    (await meRequest()).flush({ success: true, data: USER });
    await navigation;
    expect(url()).toBe('/sports');
    expect(TestBed.inject(AuthService).currentUser()).toEqual(USER);
  });

  it('ends a session the backend rejects', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    (await meRequest()).flush({}, { status: 401, statusText: 'Unauthorized' });
    await navigation;
    expect(url()).toBe('/login?returnUrl=%2Fsports');
    expect(TestBed.inject(AuthService).consumeMessage()).toBe(SESSION_EXPIRED_MESSAGE);
  });

  it('asks to log in again when the session check fails for another reason', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/sports');
    (await meRequest()).flush({}, { status: 500, statusText: 'Error' });
    await navigation;
    expect(url()).toBe('/login?returnUrl=%2Fsports');
    expect(TestBed.inject(AuthService).consumeMessage()).toBe(SESSION_CHECK_FAILED_MESSAGE);
  });

  it('keeps signed-in users off the login page', async () => {
    signIn();
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/login');
    (await meRequest()).flush({ success: true, data: USER });
    await navigation;
    expect(url()).toBe('/dashboard');
  });
});
