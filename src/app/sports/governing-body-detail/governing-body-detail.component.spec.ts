import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authServiceAs } from '../../../testing/auth.fixtures';
import { listOf, sampleGoverningBody, sampleOrganisation } from '../../../testing/hierarchy-fixtures';
import { UserRole } from '../../auth/models/auth.model';
import { FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../../common/constants/http.constants';
import { AuthService } from '../../core/auth/services/auth.service';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { GoverningBodyDetailPage } from './governing-body-detail.component';

describe('GoverningBodyDetailPage', () => {
  let fixture: ComponentFixture<GoverningBodyDetailPage>;
  let element: HTMLElement;
  let api: {
    getGoverningBody$: ReturnType<typeof vi.fn>;
    getGoverningBodyCounts$: ReturnType<typeof vi.fn>;
    getOrganisations$: ReturnType<typeof vi.fn>;
    createOrganisation$: ReturnType<typeof vi.fn>;
  };

  interface SetUpOptions {
    sportId?: string;
    role?: UserRole;
    // Swaps fake responses before the page is created.
    adjust?: () => void;
  }

  async function setUp({ sportId = 's1', role = 'ADMIN', adjust }: SetUpOptions = {}): Promise<void> {
    api = {
      getGoverningBody$: vi.fn(() => of(sampleGoverningBody())),
      getGoverningBodyCounts$: vi.fn(() => of({ organisations: 1, participants: 2 })),
      getOrganisations$: vi.fn(() => of(listOf([sampleOrganisation()]))),
      createOrganisation$: vi.fn(() => of(sampleOrganisation({ id: 'o2', name: 'La Liga' }))),
    };
    adjust?.();
    await TestBed.configureTestingModule({
      imports: [GoverningBodyDetailPage],
      providers: [
        provideRouter([]),
        { provide: HierarchyApiService, useValue: api },
        { provide: AuthService, useValue: authServiceAs(role) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GoverningBodyDetailPage);
    fixture.componentRef.setInput('sportId', sportId);
    fixture.componentRef.setInput('governingBodyId', 'g1');
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

  it('shows the governing body, its counts beside the header and its organisations', async () => {
    await setUp();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('UEFA');
    const totals = Array.from(element.querySelectorAll('.detail-page__side-stats app-stat-card.stat-card--compact'));
    expect(totals.map((card) => card.querySelector('.stat-card__value')?.textContent?.trim())).toEqual(['1', '2']);
    expect(
      Array.from(element.querySelectorAll('tbody td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim())
    ).toEqual(['P Premier League', '2']);
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/sports/s1/governing-bodies/g1/organisations/o1'
    );
  });

  it('moves between levels without changing the address bar', async () => {
    await setUp();
    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => link.injector.get(RouterLink).skipLocationChange)).toBe(true);
  });

  it('links back up through the sport in the breadcrumbs', async () => {
    await setUp();
    const links = Array.from(element.querySelectorAll('app-breadcrumbs a')).map((link) => [
      link.textContent?.trim(),
      link.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Sport', '/sports'],
      ['Football', '/sports/s1'],
    ]);
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('UEFA');
  });

  it('adds an organisation under this governing body and refreshes the counts', async () => {
    await setUp();
    (
      Array.from(element.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add Organisation')
      ) as HTMLButtonElement
    ).click();
    await settle();
    const name = element.querySelector('#entity-name') as HTMLInputElement;
    name.value = 'La Liga';
    name.dispatchEvent(new Event('input'));
    await settle();
    (element.querySelector('app-entity-form-dialog button[type="submit"]') as HTMLButtonElement).click();
    await settle();
    expect(api.createOrganisation$).toHaveBeenCalledWith({ name: 'La Liga', governingBodyId: 'g1' });
    expect(api.getGoverningBodyCounts$).toHaveBeenCalledTimes(2);
  });

  it('treats a governing body from another sport as not found', async () => {
    await setUp({ sportId: 'another-sport' });
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("doesn't exist here");
  });

  for (const [role, allowed] of [
    ['ADMIN', true],
    ['OPERATOR', true],
    ['VIEWER', false],
    ['ORG', false],
  ] as const) {
    it(`${allowed ? 'offers' : 'offers no'} Add Organisation to ${role}`, async () => {
      await setUp({ role });
      expect(!!buttonWithText('Add Organisation')).toBe(allowed);
    });
  }

  it('says so when the governing body does not exist', async () => {
    await setUp({ adjust: () => api.getGoverningBody$.mockImplementation(failWith(404)) });
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain(
      "This governing body doesn't exist here"
    );
    expect(element.querySelector('.detail-page__error')).toBeNull();
  });

  for (const [status, message] of [
    [429, RATE_LIMITED_MESSAGE],
    [403, FORBIDDEN_LOAD_MESSAGE],
    [500, "Couldn't load this governing body. Please try again."],
  ] as const) {
    it(`shows why the governing body couldn't load (${status}) in place of the header`, async () => {
      await setUp({ adjust: () => api.getGoverningBody$.mockImplementation(failWith(status)) });
      expect(text('.detail-page__error > span')).toEqual([message]);
      expect(element.querySelector('app-detail-header')).toBeNull();
      expect(element.querySelector('.detail-page__missing')).toBeNull();
    });
  }

  it('loads the governing body again from Try again and shows the header once it arrives', async () => {
    await setUp({ adjust: () => api.getGoverningBody$.mockImplementation(failWith(429)) });
    api.getGoverningBody$.mockReturnValue(of(sampleGoverningBody()));
    buttonWithText('Try again')!.click();
    await settle();
    expect(api.getGoverningBody$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('UEFA');
  });

  it('explains a rate-limited organisations list and keeps the governing body on show', async () => {
    await setUp({ adjust: () => api.getOrganisations$.mockImplementation(failWith(429)) });
    expect(text('.detail-page__error > span')).toEqual([RATE_LIMITED_MESSAGE]);
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('UEFA');
    expect(text('tbody td')).toEqual(['Organisations could not be loaded.']);
  });

  it('loads the organisations again from the list’s Try again', async () => {
    await setUp({ adjust: () => api.getOrganisations$.mockImplementation(failWith(429)) });
    api.getOrganisations$.mockReturnValue(of(listOf([sampleOrganisation()])));
    buttonWithText('Try again')!.click();
    await settle();
    expect(api.getOrganisations$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(text('tbody td')).not.toEqual(['Organisations could not be loaded.']);
  });
});
