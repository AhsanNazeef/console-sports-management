import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { NAV_GROUPS } from './common/constants/navigation.constants';
import { PageTitleService } from './core/page-title.service';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: TitleStrategy, useExisting: PageTitleService }],
    });
  });

  it('gives every sidebar item a route with a title', () => {
    const shellRoutes = routes[0].children ?? [];
    for (const item of NAV_GROUPS.flatMap((group) => group.items)) {
      const route = shellRoutes.find((child) => `/${child.path}` === item.path);
      expect(route?.title, item.path).toBeTruthy();
    }
  });

  it('opens the dashboard inside the shell', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.fixture.nativeElement.querySelector('.header__title')?.textContent).toContain('Dashboard');
  });

  it('sends unknown addresses to the dashboard', async () => {
    await RouterTestingHarness.create('/no-such-page');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });
});
