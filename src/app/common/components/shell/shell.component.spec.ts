import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, of } from 'rxjs';
import { PageTitleService } from '../../../core/page-title.service';
import { SearchService } from '../../services/search.service';
import { ViewportService } from '../../services/viewport.service';
import { ShellComponent } from './shell.component';

@Component({ template: '' })
class BlankPage {}

type Layout = 'desktop' | 'tablet' | 'phone';

describe('ShellComponent', () => {
  let harness: RouterTestingHarness;

  async function setUp(layout: Layout = 'desktop'): Promise<void> {
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
        {
          provide: ViewportService,
          useValue: { isPhone$: of(layout === 'phone'), isTablet$: of(layout === 'tablet') },
        },
      ],
    });
    harness = await RouterTestingHarness.create('/sports');
  }

  const query = (selector: string): HTMLElement | null => harness.fixture.nativeElement.querySelector(selector);

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
