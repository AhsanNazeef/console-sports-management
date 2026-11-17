import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, Observable, of, Subject } from 'rxjs';
import { authServiceAs } from '../../../../testing/auth.fixtures';
import { UserRole } from '../../../auth/models/auth.model';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PageTitleService } from '../../../core/page-title.service';
import { FORBIDDEN_MESSAGE, RATE_LIMITED_MESSAGE } from '../../constants/http.constants';
import { HttpNoticeService } from '../../services/http-notice.service';
import { SearchService } from '../../services/search.service';
import { ViewportService } from '../../services/viewport.service';
import { ShellComponent } from './shell.component';

@Component({ template: '' })
class BlankPage {}

type Layout = 'desktop' | 'tablet' | 'phone';

const ACCESS_ERROR_TEXT = "Couldn't load your account's permissions, so changes and some pages are hidden.";

function fakeAuthService(role: UserRole) {
  return {
    ...authServiceAs(role),
    accessError: signal<HttpErrorResponse | null>(null),
    reloadAccess$: vi.fn<() => Observable<void>>(() => of(undefined)),
    signOut: vi.fn(),
  };
}

describe('ShellComponent', () => {
  let harness: RouterTestingHarness;
  let authService: ReturnType<typeof fakeAuthService>;

  async function setUp(layout: Layout = 'desktop', role: UserRole = 'ADMIN'): Promise<void> {
    authService = fakeAuthService(role);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: ShellComponent,
            children: [
              { path: 'sports', title: 'Sport Management', component: BlankPage },
              { path: 'users', title: 'Users', component: BlankPage },
            ],
          },
        ]),
        { provide: TitleStrategy, useExisting: PageTitleService },
        { provide: AuthService, useValue: authService },
        {
          provide: ViewportService,
          useValue: { isPhone$: of(layout === 'phone'), isTablet$: of(layout === 'tablet') },
        },
      ],
    });
    harness = await RouterTestingHarness.create('/sports');
  }

  const query = (selector: string): HTMLElement | null => harness.fixture.nativeElement.querySelector(selector);
  const noticeButton = (): HTMLButtonElement | null =>
    harness.fixture.nativeElement.querySelector('.shell__notice app-button button');
  const groupLabels = (): string[] =>
    Array.from(harness.fixture.nativeElement.querySelectorAll('.sidebar__group-toggle') as NodeListOf<HTMLElement>).map(
      (toggle) => toggle.textContent?.trim() ?? ''
    );

  function showNotice(status: 403 | 429): void {
    TestBed.inject(HttpNoticeService).show(status);
    harness.fixture.detectChanges();
  }

  function failAccess(status: number): void {
    authService.accessError.set(new HttpErrorResponse({ status }));
    harness.fixture.detectChanges();
  }

  it('shows the sidebar and the current page title', async () => {
    await setUp();
    expect(query('app-sidebar')).toBeTruthy();
    expect(query('.header__title')?.textContent).toContain('Sport Management');
    expect(query('.header__menu')).toBeNull();
  });

  it('shares the search text and clears it on navigation', async () => {
    await setUp();
    const search = TestBed.inject(SearchService);
    const input = query('.header__search-input') as HTMLInputElement;
    input.value = 'foot';
    input.dispatchEvent(new Event('input'));
    expect(await firstValueFrom(search.query$)).toBe('foot');

    await harness.navigateByUrl('/users');
    expect(await firstValueFrom(search.query$)).toBe('');
    expect(query('.header__title')?.textContent).toContain('Users');
  });

  it('keeps the search when only the query of the address changes', async () => {
    await setUp();
    const search = TestBed.inject(SearchService);
    search.setQuery('foot');
    await harness.navigateByUrl('/sports?page=2');
    expect(await firstValueFrom(search.query$)).toBe('foot');
  });

  it('keeps a search the next page brings in its address', async () => {
    await setUp();
    const search = TestBed.inject(SearchService);
    search.setQuery('card');
    await harness.navigateByUrl('/users?search=card');
    expect(await firstValueFrom(search.query$)).toBe('card');
  });

  it('explains a refused request above the page until dismissed', async () => {
    await setUp();
    showNotice(403);
    expect(query('.shell__notice')?.textContent).toContain(FORBIDDEN_MESSAGE);
    expect(noticeButton()?.textContent?.trim()).toBe('Dismiss');

    noticeButton()?.click();
    harness.fixture.detectChanges();
    expect(query('.shell__notice')).toBeNull();
  });

  it('keeps the notices outside the scrolling page, so they stay in view', async () => {
    await setUp();
    showNotice(403);
    failAccess(500);
    const notices = harness.fixture.nativeElement.querySelectorAll('.shell__notice');
    expect(notices.length).toBe(2);
    const content = query('.shell__content') as HTMLElement;
    expect(content.tagName).toBe('MAIN');
    for (const notice of Array.from(notices) as HTMLElement[]) {
      expect(content.contains(notice)).toBe(false);
    }
  });

  it('gives focus to the page when Dismiss removes the notice it was on', async () => {
    await setUp();
    showNotice(403);
    noticeButton()?.focus();
    expect(document.activeElement).toBe(noticeButton());

    noticeButton()?.click();
    await harness.fixture.whenStable();
    expect(query('.shell__notice')).toBeNull();
    expect(document.activeElement).toBe(query('.shell__content'));
  });

  it('asks to wait after a rate-limited request', async () => {
    await setUp();
    showNotice(429);
    expect(query('.shell__notice')?.textContent).toContain(RATE_LIMITED_MESSAGE);
  });

  it('clears the notice when another page opens', async () => {
    await setUp();
    showNotice(429);
    expect(query('.shell__notice')).toBeTruthy();

    await harness.navigateByUrl('/users');
    expect(query('.shell__notice')).toBeNull();
  });

  it('clears the notice when the next page brings a search in its address, and keeps the search', async () => {
    await setUp();
    const search = TestBed.inject(SearchService);
    search.setQuery('card');
    showNotice(403);

    await harness.navigateByUrl('/users?search=card');
    harness.fixture.detectChanges();
    expect(query('.shell__notice')).toBeNull();
    expect(await firstValueFrom(search.query$)).toBe('card');
  });

  it('keeps the notice when only the query of the address changes', async () => {
    await setUp();
    showNotice(403);

    await harness.navigateByUrl('/sports?page=2');
    harness.fixture.detectChanges();
    expect(query('.shell__notice')?.textContent).toContain(FORBIDDEN_MESSAGE);
  });

  it('shows no permissions message while the access has loaded', async () => {
    await setUp();
    expect(query('.shell__notice')).toBeNull();
  });

  it('asks to wait when loading the permissions was rate limited', async () => {
    await setUp();
    failAccess(429);
    const text = query('.shell__notice')?.textContent;
    expect(text).toContain(ACCESS_ERROR_TEXT);
    expect(text).toContain(RATE_LIMITED_MESSAGE);
    expect(noticeButton()?.textContent?.trim()).toBe('Try again');
  });

  it('asks to try again when loading the permissions failed otherwise', async () => {
    await setUp();
    failAccess(500);
    const text = query('.shell__notice')?.textContent;
    expect(text).toContain(`${ACCESS_ERROR_TEXT} Please try again.`);
    expect(text).not.toContain(RATE_LIMITED_MESSAGE);
  });

  it('loads the permissions again from Try again, and waits for the answer', async () => {
    await setUp();
    const reload = new Subject<void>();
    authService.reloadAccess$.mockReturnValue(reload);
    failAccess(500);

    noticeButton()?.click();
    harness.fixture.detectChanges();
    expect(authService.reloadAccess$).toHaveBeenCalledTimes(1);
    expect(noticeButton()?.textContent?.trim()).toBe('Loading…');
    expect(noticeButton()?.disabled).toBe(true);

    reload.complete();
    harness.fixture.detectChanges();
    expect(noticeButton()?.textContent?.trim()).toBe('Try again');
    expect(noticeButton()?.disabled).toBe(false);
  });

  it('gives focus to the page when the permissions load again and the Try again row goes away', async () => {
    await setUp();
    const reload = new Subject<void>();
    authService.reloadAccess$.mockReturnValue(reload);
    failAccess(500);
    noticeButton()?.focus();

    noticeButton()?.click();
    harness.fixture.detectChanges();
    authService.accessError.set(null);
    reload.complete();
    await harness.fixture.whenStable();
    expect(query('.shell__notice')).toBeNull();
    expect(document.activeElement).toBe(query('.shell__content'));
  });

  it('hides Payments and the Finance group from an account that may not view payments', async () => {
    await setUp('desktop', 'ORG');
    expect(query('.sidebar__item[href="/payments"]')).toBeNull();
    expect(groupLabels()).not.toContain('Finance');
    expect(query('.sidebar__item[href="/sports"]')).toBeTruthy();
  });

  it('lists Payments under Finance for an account that may view payments', async () => {
    await setUp('desktop', 'VIEWER');
    expect(query('.sidebar__item[href="/payments"]')).toBeTruthy();
    expect(groupLabels()).toContain('Finance');
  });

  it('shows the signed-in user and signs out from the sidebar', async () => {
    await setUp();
    expect(query('.sidebar__user-email')?.textContent).toBe('admin@buzzer.dev');
    (query('.sidebar__sign-out') as HTMLButtonElement).click();
    expect(authService.signOut).toHaveBeenCalledTimes(1);
  });

  it('collapses the sidebar', async () => {
    await setUp();
    (query('.sidebar__collapse') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(query('.sidebar--collapsed')).toBeTruthy();
  });

  it('starts with the icon rail on a tablet', async () => {
    await setUp('tablet');
    expect(query('.sidebar--collapsed')).toBeTruthy();
  });

  it('opens the sidebar as a drawer on a phone and closes it after a choice', async () => {
    await setUp('phone');
    expect(query('.shell--phone')).toBeTruthy();
    expect(query('.sidebar--collapsed')).toBeNull();

    (query('.header__menu') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(query('.shell--drawer-open')).toBeTruthy();

    (query('.sidebar__item[href="/users"]') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();
    expect(query('.shell--drawer-open')).toBeNull();
  });

  it('closes the phone drawer from the backdrop and the Escape key', async () => {
    await setUp('phone');
    (query('.header__menu') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    (query('.shell__backdrop') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(query('.shell--drawer-open')).toBeNull();

    (query('.header__menu') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await harness.fixture.whenStable();
    expect(query('.shell--drawer-open')).toBeNull();
  });
});
