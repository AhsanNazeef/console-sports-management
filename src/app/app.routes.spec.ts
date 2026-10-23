import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { fakeJwt } from '../testing/fake-jwt';
import { routes } from './app.routes';
import { ACCESS_TOKEN_KEY } from './auth/constants/auth.constants';
import { ShellComponent } from './common/components/shell/shell.component';
import { NAV_GROUPS } from './common/constants/navigation.constants';
import { PageTitleService } from './core/page-title.service';

describe('app routes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TitleStrategy, useExisting: PageTitleService },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => sessionStorage.clear());

  const url = (): string => TestBed.inject(Router).url;

  async function openSignedIn(path: string): Promise<RouterTestingHarness> {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(900) }));
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(path);
    const me = await vi.waitFor(() => http.expectOne(`${environment.apiBaseUrl}/auth/me`));
    me.flush({ success: true, data: { id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' } });
    await navigation;
    return harness;
  }

  it('gives every sidebar item a route with a title', () => {
    const shellRoutes = routes.find((route) => route.component === ShellComponent)?.children ?? [];
    for (const item of NAV_GROUPS.flatMap((group) => group.items)) {
      const route = shellRoutes.find((child) => `/${child.path}` === item.path);
      expect(route?.title, item.path).toBeTruthy();
    }
  });

  it('sends signed-out visitors to the login page', async () => {
    await RouterTestingHarness.create('/');
    expect(url()).toBe('/login');
  });

  it('opens the dashboard inside the shell once signed in', async () => {
    const harness = await openSignedIn('/');
    expect(url()).toBe('/dashboard');
    expect(harness.fixture.nativeElement.querySelector('.header__title')?.textContent).toContain('Dashboard');
  });

  it('sends unknown addresses to the dashboard', async () => {
    await openSignedIn('/no-such-page');
    expect(url()).toBe('/dashboard');
  });
});
