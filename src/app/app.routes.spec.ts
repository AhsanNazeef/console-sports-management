import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { demoUser, ROLE_PERMISSIONS } from '../testing/auth.fixtures';
import { fakeJwt } from '../testing/fake-jwt';
import { routes } from './app.routes';
import { ACCESS_TOKEN_KEY } from './auth/constants/auth.constants';
import { UserRole } from './auth/models/auth.model';
import { ShellComponent } from './common/components/shell/shell.component';
import { RATE_LIMITED_MESSAGE } from './common/constants/http.constants';
import { NAV_GROUPS } from './common/constants/navigation.constants';
import { PageTitleService } from './core/page-title.service';
import { summary, transaction } from './payments/testing/payment.fixtures';

const API = environment.apiBaseUrl;
const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
const SHELL_ROUTES = routes.find((route) => route.component === ShellComponent)?.children ?? [];

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

  afterEach(() => {
    sessionStorage.clear();
    http.verify();
  });

  const url = (): string => TestBed.inject(Router).url;
  const page = (harness: RouterTestingHarness): HTMLElement => harness.fixture.nativeElement as HTMLElement;
  const paymentsLink = (harness: RouterTestingHarness): Element | null =>
    page(harness).querySelector('.sidebar__item[href="/payments"]');
  const groupLabels = (harness: RouterTestingHarness): string[] =>
    [...page(harness).querySelectorAll('.sidebar__group-toggle')].map((toggle) => toggle.textContent?.trim() ?? '');

  const permissionsRequest = (role: UserRole): Promise<TestRequest> =>
    vi.waitFor(() => http.expectOne(`${API}/users/${demoUser(role).id}/permissions`));
  const permissionsAnswer = (role: UserRole): object => ({
    success: true,
    data: { userId: demoUser(role).id, role, permissions: [...ROLE_PERMISSIONS[role]] },
  });

  // Signs in as a demo account and starts a navigation, answering /auth/me; the caller answers the access requests.
  async function startSignedIn(
    path: string,
    role: UserRole
  ): Promise<{ harness: RouterTestingHarness; navigation: Promise<unknown> }> {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ value: fakeJwt(900) }));
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(path);
    const me = await vi.waitFor(() => http.expectOne(`${API}/auth/me`));
    me.flush({ success: true, data: demoUser(role) });
    return { harness, navigation };
  }

  // Opens a page signed in as a demo account, with its live permission list (and, for ORG, its club).
  async function openSignedIn(path: string, role: UserRole = 'ADMIN'): Promise<RouterTestingHarness> {
    const { harness, navigation } = await startSignedIn(path, role);
    (await permissionsRequest(role)).flush(permissionsAnswer(role));
    if (role === 'ORG') {
      const organisation = await vi.waitFor(() => http.expectOne(`${API}/organization`));
      organisation.flush({ success: true, data: { id: 'club-own', name: 'Own Club FC' } });
    }
    await navigation;
    return harness;
  }

  // Answers the two requests the Payments page makes when it opens.
  async function answerPaymentsPage(harness: RouterTestingHarness): Promise<void> {
    const totals = await vi.waitFor(() => http.expectOne(`${API}/payments/summary`));
    totals.flush({ success: true, data: summary() });
    const list = await vi.waitFor(() => http.expectOne((request) => request.url === `${API}/payments/transactions`));
    list.flush({ success: true, data: [transaction('t1')], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    await harness.fixture.whenStable();
  }

  it('gives every sidebar item a route with a title', () => {
    for (const item of NAV_ITEMS) {
      const route = SHELL_ROUTES.find((child) => `/${child.path}` === item.path);
      expect(route?.title, item.path).toBeTruthy();
    }
  });

  it('gives every sidebar item’s route the item’s access rule, and the design system none', () => {
    for (const item of NAV_ITEMS) {
      const route = SHELL_ROUTES.find((child) => `/${child.path}` === item.path);
      expect(route?.data?.['access'], item.path).toBe(item.access);
    }
    expect(SHELL_ROUTES.find((child) => child.path === 'payments')?.data?.['access']).toBe('viewPayments');
    const designSystem = SHELL_ROUTES.find((child) => child.path === 'design-system');
    expect(designSystem).toBeDefined();
    expect(designSystem?.data?.['access']).toBeUndefined();
  });

  it('sends signed-out visitors to the login page', async () => {
    await RouterTestingHarness.create('/');
    expect(url()).toBe('/login');
  });

  it('opens the dashboard inside the shell once signed in', async () => {
    const harness = await openSignedIn('/');
    expect(url()).toBe('/dashboard');
    expect(page(harness).querySelector('.header__title')?.textContent).toContain('Dashboard');
  });

  it('sends unknown addresses to the dashboard', async () => {
    await openSignedIn('/no-such-page');
    expect(url()).toBe('/dashboard');
  });

  it('keeps an ORG account off Payments and out of Finance in the sidebar', async () => {
    const harness = await openSignedIn('/payments', 'ORG');
    expect(url()).toBe('/dashboard');
    expect(paymentsLink(harness)).toBeNull();
    expect(groupLabels(harness)).not.toContain('Finance');
    expect(groupLabels(harness)).toContain('Match Management');
    http.expectNone((request) => request.url.startsWith(`${API}/payments`));

    await harness.navigateByUrl('/payments?status=PENDING');
    expect(url()).toBe('/dashboard');
    http.expectNone((request) => request.url.startsWith(`${API}/payments`));
  });

  it.each<UserRole>(['ADMIN', 'OPERATOR', 'VIEWER'])(
    'opens Payments for %s and lists it in the sidebar',
    async (role) => {
      const harness = await openSignedIn('/payments', role);
      await answerPaymentsPage(harness);
      expect(url()).toBe('/payments');
      expect(page(harness).querySelector('app-payment-list-page')).not.toBeNull();
      expect(paymentsLink(harness)?.textContent).toContain('Payments');
      expect(groupLabels(harness)).toContain('Finance');
    }
  );

  it('hides Payments while the permission list is rate-limited, and shows it once Try again loads the list', async () => {
    const { harness, navigation } = await startSignedIn('/payments', 'ADMIN');
    (await permissionsRequest('ADMIN')).flush(
      { success: false, error: { message: 'Too many requests' } },
      { status: 429, statusText: 'Too Many Requests' }
    );
    await navigation;
    await harness.fixture.whenStable();

    expect(url()).toBe('/dashboard');
    expect(paymentsLink(harness)).toBeNull();
    const row = page(harness).querySelector('.shell__notice');
    expect(row?.textContent).toContain("Couldn't load your account's permissions");
    expect(row?.textContent).toContain(RATE_LIMITED_MESSAGE);

    (row?.querySelector('app-button button') as HTMLButtonElement).click();
    (await permissionsRequest('ADMIN')).flush(permissionsAnswer('ADMIN'));
    await harness.fixture.whenStable();

    expect(paymentsLink(harness)).not.toBeNull();
    expect(groupLabels(harness)).toContain('Finance');
    expect(page(harness).textContent).not.toContain("Couldn't load your account's permissions");
  });
});
