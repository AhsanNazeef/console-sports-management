import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authServiceAs } from '../../../testing/auth.fixtures';
import { listOf, sampleGoverningBody, sampleSport } from '../../../testing/hierarchy-fixtures';
import { UserRole } from '../../auth/models/auth.model';
import { FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../../common/constants/http.constants';
import { AuthService } from '../../core/auth/services/auth.service';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { SportDetailPage } from './sport-detail.component';

describe('SportDetailPage', () => {
  let fixture: ComponentFixture<SportDetailPage>;
  let element: HTMLElement;
  let sportsApi: { getSport$: ReturnType<typeof vi.fn> };
  let hierarchyApi: {
    getSportCounts$: ReturnType<typeof vi.fn>;
    getGoverningBodies$: ReturnType<typeof vi.fn>;
    createGoverningBody$: ReturnType<typeof vi.fn>;
  };

  async function setUp(role: UserRole = 'ADMIN', adjust?: () => void): Promise<void> {
    sportsApi = { getSport$: vi.fn(() => of(sampleSport())) };
    hierarchyApi = {
      getSportCounts$: vi.fn(() => of({ governingBodies: 1, organisations: 3, participants: 40 })),
      getGoverningBodies$: vi.fn(() => of(listOf([sampleGoverningBody()]))),
      createGoverningBody$: vi.fn(() => of(sampleGoverningBody({ id: 'g2', name: 'CAF' }))),
    };
    adjust?.();
    await TestBed.configureTestingModule({
      imports: [SportDetailPage],
      providers: [
        provideRouter([]),
        { provide: SportsApiService, useValue: sportsApi },
        { provide: HierarchyApiService, useValue: hierarchyApi },
        { provide: AuthService, useValue: authServiceAs(role) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SportDetailPage);
    fixture.componentRef.setInput('sportId', 's1');
    fixture.autoDetectChanges();
    await settle();
    element = fixture.nativeElement as HTMLElement;
  }

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const text = (selector: string): string[] =>
    Array.from(element.querySelectorAll(selector)).map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  const buttonWithText = (label: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.trim() === label);
  const failWith = (status: number) => () => throwError(() => new HttpErrorResponse({ status }));

  it('shows the sport, its counts and its governing bodies, each linking one level down', async () => {
    await setUp();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Football');
    expect(text('.detail-header__field')).toContain('Description: Played with a round ball.');
    expect(text('.stat-card__value')).toEqual(['1', '3', '40']);
    expect(text('tbody tr td')).toEqual(['U UEFA', '3', '40']);
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe('/sports/s1/governing-bodies/g1');
    expect(hierarchyApi.getGoverningBodies$).toHaveBeenCalledWith('s1', { search: '', page: 1, limit: 10 });
  });

  it('moves between levels without changing the address bar', async () => {
    await setUp();
    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => link.injector.get(RouterLink).skipLocationChange)).toBe(true);
  });

  it('links back up to the catalogue from the breadcrumbs', async () => {
    await setUp();
    expect(element.querySelector('app-breadcrumbs a')?.getAttribute('href')).toBe('/sports');
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Football');
  });

  it('adds a governing body to this sport and refreshes the counts', async () => {
    await setUp();
    (
      Array.from(element.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add Governing Body')
      ) as HTMLButtonElement
    ).click();
    await settle();
    const type = (selector: string, value: string): void => {
      const input = element.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('#entity-name', 'CAF');
    type('#entity-detail', 'Africa');
    await settle();
    (element.querySelector('app-entity-form-dialog button[type="submit"]') as HTMLButtonElement).click();
    await settle();

    expect(hierarchyApi.createGoverningBody$).toHaveBeenCalledWith({ name: 'CAF', sportId: 's1', country: 'Africa' });
    expect(hierarchyApi.getSportCounts$).toHaveBeenCalledTimes(2);
    expect(hierarchyApi.getGoverningBodies$.mock.calls.length).toBeGreaterThan(1);
    expect(element.querySelector('.modal')).toBeNull();
  });

  for (const [role, allowed] of [
    ['ADMIN', true],
    ['OPERATOR', true],
    ['VIEWER', false],
    ['ORG', false],
  ] as const) {
    it(`${allowed ? 'offers' : 'offers no'} Add Governing Body to ${role}`, async () => {
      await setUp(role);
      expect(!!buttonWithText('Add Governing Body')).toBe(allowed);
    });
  }

  it('says so when the sport does not exist', async () => {
    await setUp('ADMIN', () => sportsApi.getSport$.mockImplementation(failWith(404)));
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("This sport doesn't exist");
    expect(element.querySelector('.detail-page__missing a')?.getAttribute('href')).toBe('/sports');
    expect(element.querySelector('.detail-page__error')).toBeNull();
  });

  for (const [status, message] of [
    [429, RATE_LIMITED_MESSAGE],
    [403, FORBIDDEN_LOAD_MESSAGE],
    [500, "Couldn't load this sport. Please try again."],
  ] as const) {
    it(`shows why the sport couldn't load (${status}) in place of the header`, async () => {
      await setUp('ADMIN', () => sportsApi.getSport$.mockImplementation(failWith(status)));
      expect(text('.detail-page__error > span')).toEqual([message]);
      expect(element.querySelector('app-detail-header')).toBeNull();
      expect(element.querySelector('.detail-page__missing')).toBeNull();
    });
  }

  it('loads the sport again from Try again and shows the header once it arrives', async () => {
    await setUp('ADMIN', () => sportsApi.getSport$.mockImplementation(failWith(429)));
    sportsApi.getSport$.mockReturnValue(of(sampleSport()));
    buttonWithText('Try again')!.click();
    await settle();
    expect(sportsApi.getSport$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Football');
  });

  it('explains a rate-limited governing bodies list and keeps the sport on show', async () => {
    await setUp('ADMIN', () => hierarchyApi.getGoverningBodies$.mockImplementation(failWith(429)));
    expect(text('.detail-page__error > span')).toEqual([RATE_LIMITED_MESSAGE]);
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Football');
    expect(text('tbody td')).toEqual(['Governing bodies could not be loaded.']);
  });

  it('loads the governing bodies again from the list’s Try again', async () => {
    await setUp('ADMIN', () => hierarchyApi.getGoverningBodies$.mockImplementation(failWith(429)));
    hierarchyApi.getGoverningBodies$.mockReturnValue(of(listOf([sampleGoverningBody()])));
    buttonWithText('Try again')!.click();
    await settle();
    expect(hierarchyApi.getGoverningBodies$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(text('tbody td')).not.toEqual(['Governing bodies could not be loaded.']);
  });
});
