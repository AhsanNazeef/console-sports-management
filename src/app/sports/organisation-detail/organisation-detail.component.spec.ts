import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authServiceAs } from '../../../testing/auth.fixtures';
import { listOf, sampleOrganisation, sampleParticipant, sampleSport } from '../../../testing/hierarchy-fixtures';
import { UserRole } from '../../auth/models/auth.model';
import { FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../../common/constants/http.constants';
import { AuthService } from '../../core/auth/services/auth.service';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SquadPanelComponent } from '../components/squad-panel/squad-panel.component';
import { StaffPanelComponent } from '../components/staff-panel/staff-panel.component';
import { MembersApiService } from '../services/members-api.service';
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

  let sportsApi: { getSport$: ReturnType<typeof vi.fn> };
  let members: { getSquad$: ReturnType<typeof vi.fn>; getStaffGroups$: ReturnType<typeof vi.fn> };

  interface SetUpOptions {
    governingBodyId?: string;
    role?: UserRole;
    // The club an ORG account is linked to.
    linkedOrganisationId?: string | null;
    // Swaps fake responses before the page is created.
    adjust?: () => void;
  }

  async function setUp({
    governingBodyId = 'g1',
    role = 'ADMIN',
    linkedOrganisationId = null,
    adjust,
  }: SetUpOptions = {}): Promise<void> {
    members = {
      getSquad$: vi.fn(() => of([])),
      getStaffGroups$: vi.fn(() => of([{ category: 'club_president', members: [] }])),
    };
    api = {
      getOrganisation$: vi.fn(() => of(sampleOrganisation())),
      getParticipants$: vi.fn(() => of(listOf([sampleParticipant()]))),
      createParticipant$: vi.fn(() => of(sampleParticipant({ id: 'p2' }))),
    };
    sportsApi = { getSport$: vi.fn(() => of(sampleSport())) };
    adjust?.();
    await TestBed.configureTestingModule({
      imports: [OrganisationDetailPage],
      providers: [
        provideRouter([]),
        { provide: HierarchyApiService, useValue: api },
        { provide: SportsApiService, useValue: sportsApi },
        { provide: AuthService, useValue: authServiceAs(role, linkedOrganisationId) },
        { provide: MembersApiService, useValue: members },
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
  const text = (selector: string): string[] =>
    Array.from(element.querySelectorAll(selector)).map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  const buttonWithText = (label: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.trim() === label);
  const openTab = async (label: string): Promise<void> => {
    (
      Array.from(element.querySelectorAll('[role="tab"]')).find(
        (tab) => tab.textContent?.trim() === label
      ) as HTMLButtonElement
    ).click();
    await settle();
  };
  const failWith = (status: number) => () => throwError(() => new HttpErrorResponse({ status }));

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

  it('reads the sport only for the breadcrumb, so a refusal raises the console-wide notice', async () => {
    await setUp();
    expect(sportsApi.getSport$).toHaveBeenCalledWith('s1', false);
  });

  it('moves between levels without changing the address bar', async () => {
    await setUp();
    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => link.injector.get(RouterLink).skipLocationChange)).toBe(true);
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

  it('says so when the organisation cannot be refreshed after adding a participant, and keeps the header', async () => {
    await setUp();
    api.getOrganisation$.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));
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

    const row = element.querySelector('.detail-page__error') as HTMLElement;
    expect(row.querySelector('span')?.textContent).toBe(RATE_LIMITED_MESSAGE);
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Premier League');

    buttonWithText('Try again')?.click();
    await settle();
    expect(element.querySelector('.detail-page__error')).toBeNull();
  });

  it('shows the participants first and the squad and staff on their own tabs', async () => {
    await setUp();
    const tabs = Array.from(element.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Participants', 'Squad', 'Staff']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(element.querySelector('[role="tabpanel"]')?.getAttribute('aria-label')).toBe('Participants');
    expect(members.getSquad$).not.toHaveBeenCalled();

    tabs[1].click();
    await settle();
    expect(element.querySelector('app-squad-panel')).toBeTruthy();
    expect(element.querySelector('app-data-table[label="Participants"]')).toBeNull();
    expect(members.getSquad$).toHaveBeenCalledWith('o1');

    tabs[2].click();
    await settle();
    expect(element.querySelector('app-staff-panel')).toBeTruthy();
    expect(members.getStaffGroups$).toHaveBeenCalledWith('o1');
  });

  it('treats an organisation under another governing body as not found', async () => {
    await setUp({ governingBodyId: 'another-governing-body' });
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("doesn't exist here");
  });

  for (const [role, allowed] of [
    ['ADMIN', true],
    ['OPERATOR', true],
    ['VIEWER', false],
    ['ORG', false],
  ] as const) {
    it(`${allowed ? 'offers' : 'offers no'} Add Participant to ${role}`, async () => {
      await setUp({ role, linkedOrganisationId: role === 'ORG' ? 'o1' : null });
      expect(!!buttonWithText('Add Participant')).toBe(allowed);
    });
  }

  // The route's organisation is o1.
  for (const [account, role, linkedOrganisationId, allowed] of [
    ['ADMIN', 'ADMIN', null, true],
    ['ORG on its own club', 'ORG', 'o1', true],
    ['ORG on another club', 'ORG', 'o9', false],
    ['ORG without a club', 'ORG', null, false],
    ['OPERATOR', 'OPERATOR', null, false],
    ['VIEWER', 'VIEWER', null, false],
  ] as const) {
    it(`${allowed ? 'lets' : 'does not let'} ${account} change the squad and the staff`, async () => {
      await setUp({ role, linkedOrganisationId });

      await openTab('Squad');
      expect(fixture.debugElement.query(By.directive(SquadPanelComponent)).componentInstance.canEdit()).toBe(allowed);
      expect(!!buttonWithText('Add Squad Member')).toBe(allowed);

      await openTab('Staff');
      expect(fixture.debugElement.query(By.directive(StaffPanelComponent)).componentInstance.canEdit()).toBe(allowed);
      expect(!!buttonWithText('Add Member')).toBe(allowed);
    });
  }

  it('says so when the organisation does not exist', async () => {
    await setUp({ adjust: () => api.getOrganisation$.mockImplementation(failWith(404)) });
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain(
      "This organisation doesn't exist here"
    );
    expect(element.querySelector('.detail-page__error')).toBeNull();
  });

  for (const [status, message] of [
    [429, RATE_LIMITED_MESSAGE],
    [403, FORBIDDEN_LOAD_MESSAGE],
    [500, "Couldn't load this organisation. Please try again."],
  ] as const) {
    it(`shows why the organisation couldn't load (${status}) in place of the header`, async () => {
      await setUp({ adjust: () => api.getOrganisation$.mockImplementation(failWith(status)) });
      expect(text('.detail-page__error > span')).toEqual([message]);
      expect(element.querySelector('app-detail-header')).toBeNull();
      expect(element.querySelector('.detail-page__missing')).toBeNull();
    });
  }

  it('loads the organisation again from Try again and shows the header once it arrives', async () => {
    await setUp({ adjust: () => api.getOrganisation$.mockImplementation(failWith(429)) });
    api.getOrganisation$.mockReturnValue(of(sampleOrganisation()));
    buttonWithText('Try again')!.click();
    await settle();
    expect(api.getOrganisation$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Premier League');
  });

  it('explains a rate-limited participants list and keeps the organisation on show', async () => {
    await setUp({ adjust: () => api.getParticipants$.mockImplementation(failWith(429)) });
    expect(text('.detail-page__error > span')).toEqual([RATE_LIMITED_MESSAGE]);
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Premier League');
    expect(text('tbody td')).toEqual(['Participants could not be loaded.']);
  });

  it('loads the participants again from the list’s Try again', async () => {
    await setUp({ adjust: () => api.getParticipants$.mockImplementation(failWith(429)) });
    api.getParticipants$.mockReturnValue(of(listOf([sampleParticipant()])));
    buttonWithText('Try again')!.click();
    await settle();
    expect(api.getParticipants$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(text('tbody td')).not.toEqual(['Participants could not be loaded.']);
  });
});
