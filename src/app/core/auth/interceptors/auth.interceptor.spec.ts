import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { SKIP_SESSION_EXPIRY } from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  const authService = { getAccessToken: vi.fn<() => string | null>(), expireSession: vi.fn() };

  beforeEach(() => {
    authService.getAccessToken.mockReturnValue('token-123');
    authService.expireSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adds the Bearer token to backend requests', () => {
    client.get(`${environment.apiBaseUrl}/organizations/sports`).subscribe();
    const request = http.expectOne(`${environment.apiBaseUrl}/organizations/sports`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({});
  });

  it('never sends the token to other hosts', () => {
    client.get('https://example.com/data').subscribe();
    const request = http.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('sends no header when there is no session', () => {
    authService.getAccessToken.mockReturnValue(null);
    client.get(`${environment.apiBaseUrl}/auth/me`).subscribe({ error: () => undefined });
    const request = http.expectOne(`${environment.apiBaseUrl}/auth/me`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('ends the session on a 401 and passes the error on', () => {
    let failed = false;
    client.get(`${environment.apiBaseUrl}/organizations/sports`).subscribe({ error: () => (failed = true) });
    http
      .expectOne(`${environment.apiBaseUrl}/organizations/sports`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authService.expireSession).toHaveBeenCalledTimes(1);
    expect(failed).toBe(true);
  });

  it('leaves 401s alone for requests that handle them, and other errors', () => {
    const context = new HttpContext().set(SKIP_SESSION_EXPIRY, true);
    client.post(`${environment.apiBaseUrl}/auth/login`, {}, { context }).subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    client.get(`${environment.apiBaseUrl}/organizations/sports`).subscribe({ error: () => undefined });
    http.expectOne(`${environment.apiBaseUrl}/organizations/sports`).flush({}, { status: 500, statusText: 'Error' });
    expect(authService.expireSession).not.toHaveBeenCalled();
  });
});
