import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FORBIDDEN_MESSAGE, RATE_LIMITED_MESSAGE, SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { HttpNoticeService } from '../../common/services/http-notice.service';
import { httpNoticeInterceptor } from './http-notice.interceptor';

describe('httpNoticeInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let notices: HttpNoticeService;
  const URL = `${environment.apiBaseUrl}/matches`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpNoticeInterceptor])), provideHttpClientTesting()],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(HttpNoticeService);
  });

  afterEach(() => http.verify());

  function fail(url: string, status: number, context?: HttpContext): unknown {
    let received: unknown = null;
    client.get(url, { context }).subscribe({ error: (error: unknown) => (received = error) });
    http.expectOne(url).flush({}, { status, statusText: 'Error' });
    return received;
  }

  it('explains a refused request and still passes the error on', () => {
    const error = fail(URL, 403);
    expect(notices.notice()).toBe(FORBIDDEN_MESSAGE);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(403);
  });

  it('asks to wait and try again when rate limited', () => {
    fail(URL, 429);
    expect(notices.notice()).toBe(RATE_LIMITED_MESSAGE);
  });

  it('leaves other errors, and other hosts, to the page', () => {
    fail(URL, 500);
    fail('https://example.com/data', 403);
    expect(notices.notice()).toBeNull();
  });

  it('leaves a 403 or 429 to the page when the request shows its own error', () => {
    const inline = new HttpContext().set(SKIP_HTTP_NOTICE, true);
    const refused = fail(URL, 403, inline);
    const limited = fail(URL, 429, inline);
    expect(notices.notice()).toBeNull();
    expect((refused as HttpErrorResponse).status).toBe(403);
    expect((limited as HttpErrorResponse).status).toBe(429);
  });
});
