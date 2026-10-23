import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { listOf, sampleGoverningBody, sampleOrganisation } from '../../../testing/hierarchy-fixtures';
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

  async function setUp(sportId = 's1'): Promise<void> {
    api = {
      getGoverningBody$: vi.fn(() => of(sampleGoverningBody())),
      getGoverningBodyCounts$: vi.fn(() => of({ organisations: 1, participants: 2 })),
      getOrganisations$: vi.fn(() => of(listOf([sampleOrganisation()]))),
      createOrganisation$: vi.fn(() => of(sampleOrganisation({ id: 'o2', name: 'La Liga' }))),
    };
    await TestBed.configureTestingModule({
      imports: [GoverningBodyDetailPage],
      providers: [
        provideRouter([]),
        { provide: HierarchyApiService, useValue: api },
        { provide: AuthService, useValue: { hasAnyRole: () => true } },
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
    await setUp('another-sport');
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("doesn't exist here");
  });
});
