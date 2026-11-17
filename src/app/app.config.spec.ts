import { HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../environments/environment';
import { appConfig } from './app.config';
import { FORBIDDEN_MESSAGE, SKIP_HTTP_NOTICE } from './common/constants/http.constants';
import { HttpNoticeService } from './common/services/http-notice.service';

const SCOREBOARD_URL = `${environment.apiBaseUrl}/matches/m1/scoreboard`;

describe('appConfig', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let notices: HttpNoticeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    notices = TestBed.inject(HttpNoticeService);
  });

  afterEach(() => http.verify());

  it('shows the console-wide notice for a backend request the account is refused', () => {
    let failed = false;
    client.get(SCOREBOARD_URL).subscribe({ error: () => (failed = true) });
    http
      .expectOne(SCOREBOARD_URL)
      .flush({ success: false, error: { message: 'Insufficient role' } }, { status: 403, statusText: 'Forbidden' });
    expect(notices.notice()).toBe(FORBIDDEN_MESSAGE);
    expect(failed).toBe(true);
  });

  it('leaves the notice to requests whose page shows the error itself', () => {
    const context = new HttpContext().set(SKIP_HTTP_NOTICE, true);
    client.get(SCOREBOARD_URL, { context }).subscribe({ error: () => undefined });
    http
      .expectOne(SCOREBOARD_URL)
      .flush(
        { success: false, error: { message: 'Too many requests' } },
        { status: 429, statusText: 'Too Many Requests' }
      );
    expect(notices.notice()).toBeNull();
  });
});
