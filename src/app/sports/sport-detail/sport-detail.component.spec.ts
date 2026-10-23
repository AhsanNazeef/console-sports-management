import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { listOf, sampleGoverningBody, sampleSport } from '../../../testing/hierarchy-fixtures';
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

  async function setUp(canEdit = true, adjust?: () => void): Promise<void> {
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
        { provide: AuthService, useValue: { hasAnyRole: () => canEdit } },
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

  it('offers no Add button to roles that cannot change the catalogue', async () => {
    await setUp(false);
    expect(
      Array.from(element.querySelectorAll('button')).some((b) => b.textContent?.includes('Add Governing Body'))
    ).toBe(false);
  });

  it('says so when the sport does not exist', async () => {
    await setUp(true, () =>
      sportsApi.getSport$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })))
    );
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("This sport doesn't exist");
    expect(element.querySelector('.detail-page__missing a')?.getAttribute('href')).toBe('/sports');
  });
});
