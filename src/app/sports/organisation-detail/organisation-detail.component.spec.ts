import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { listOf, sampleOrganisation, sampleParticipant, sampleSport } from '../../../testing/hierarchy-fixtures';
import { AuthService } from '../../core/auth/services/auth.service';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { OrganisationDetailPage } from './organisation-detail.component';

describe('OrganisationDetailPage', () => {
  let fixture: ComponentFixture<OrganisationDetailPage>;
  let element: HTMLElement;
  let api: {
    getOrganisation$: ReturnType<typeof vi.fn>;
    getParticipants$: ReturnType<typeof vi.fn>;
    createParticipant$: ReturnType<typeof vi.fn>;
  };

  async function setUp(governingBodyId = 'g1'): Promise<void> {
    api = {
      getOrganisation$: vi.fn(() => of(sampleOrganisation())),
      getParticipants$: vi.fn(() => of(listOf([sampleParticipant()]))),
      createParticipant$: vi.fn(() => of(sampleParticipant({ id: 'p2' }))),
    };
    await TestBed.configureTestingModule({
      imports: [OrganisationDetailPage],
      providers: [
        provideRouter([]),
        { provide: HierarchyApiService, useValue: api },
        { provide: SportsApiService, useValue: { getSport$: () => of(sampleSport()) } },
        { provide: AuthService, useValue: { hasAnyRole: () => true } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrganisationDetailPage);
    fixture.componentRef.setInput('sportId', 's1');
    fixture.componentRef.setInput('governingBodyId', governingBodyId);
    fixture.componentRef.setInput('organisationId', 'o1');
    fixture.autoDetectChanges();
    await settle();
    element = fixture.nativeElement as HTMLElement;
  }

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  it('lists the participants by name, each linking to their own page', async () => {
    await setUp();
    const cells = Array.from(element.querySelectorAll('tbody td')).map((td) =>
      td.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(cells).toEqual(['A Ana Silva']);
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/sports/s1/governing-bodies/g1/organisations/o1/participants/p1'
    );
  });

  it('links back up through every level in the breadcrumbs', async () => {
    await setUp();
    const links = Array.from(element.querySelectorAll('app-breadcrumbs a')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/sports', '/sports/s1', '/sports/s1/governing-bodies/g1']);
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Premier League');
  });

  it('adds a participant to one of the organisation’s teams and refreshes the list and the teams', async () => {
    await setUp();
    (
      Array.from(element.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add Participant')
      ) as HTMLButtonElement
    ).click();
    await settle();
    for (const [selector, value] of [
      ['#participant-first-name', 'Rui'],
      ['#participant-last-name', 'Costa'],
    ]) {
      const input = element.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await settle();
    (element.querySelector('app-participant-form-dialog button[type="submit"]') as HTMLButtonElement).click();
    await settle();

    expect(api.createParticipant$).toHaveBeenCalledWith('o1', {
      participant: { firstName: 'Rui', lastName: 'Costa' },
      teamId: 't1',
      newTeamName: null,
    });
    expect(api.getParticipants$.mock.calls.length).toBeGreaterThan(1);
    expect(api.getOrganisation$).toHaveBeenCalledTimes(2);
  });

  it('treats an organisation under another governing body as not found', async () => {
    await setUp('another-governing-body');
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("doesn't exist here");
  });
});
