import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of, throwError } from 'rxjs';
import { sampleOrganisation, sampleParticipant, sampleSport } from '../../../testing/hierarchy-fixtures';
import { FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../../common/constants/http.constants';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { ParticipantDetailPage } from './participant-detail.component';

describe('ParticipantDetailPage', () => {
  let fixture: ComponentFixture<ParticipantDetailPage>;
  let element: HTMLElement;
  let api: { getParticipant$: ReturnType<typeof vi.fn>; getOrganisation$: ReturnType<typeof vi.fn> };
  let sportsApi: { getSport$: ReturnType<typeof vi.fn> };

  // `adjust` can swap fake responses before the page is created.
  async function setUp(organisationId = 'o1', adjust?: () => void): Promise<void> {
    api = {
      getParticipant$: vi.fn(() => of(sampleParticipant())),
      getOrganisation$: vi.fn(() => of(sampleOrganisation())),
    };
    sportsApi = { getSport$: vi.fn(() => of(sampleSport())) };
    adjust?.();
    await TestBed.configureTestingModule({
      imports: [ParticipantDetailPage],
      providers: [
        provideRouter([]),
        { provide: HierarchyApiService, useValue: api },
        { provide: SportsApiService, useValue: sportsApi },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ParticipantDetailPage);
    fixture.componentRef.setInput('sportId', 's1');
    fixture.componentRef.setInput('governingBodyId', 'g1');
    fixture.componentRef.setInput('organisationId', organisationId);
    fixture.componentRef.setInput('participantId', 'p1');
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

  it('shows the participant and their team', async () => {
    await setUp();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Ana Silva');
    const facts = Array.from(element.querySelectorAll('.detail-header__field')).map((field) =>
      field.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(facts.slice(0, 3)).toEqual(['Team: First XI', 'Position: Forward', 'Jersey number: 9']);
  });

  it('reads the organisation and the sport only for the breadcrumbs, so a refusal raises the console-wide notice', async () => {
    await setUp();
    expect(api.getOrganisation$).toHaveBeenCalledWith('o1', false);
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
    const links = Array.from(element.querySelectorAll('app-breadcrumbs a')).map((link) => [
      link.textContent?.trim(),
      link.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Sport', '/sports'],
      ['Football', '/sports/s1'],
      ['UEFA', '/sports/s1/governing-bodies/g1'],
      ['Premier League', '/sports/s1/governing-bodies/g1/organisations/o1'],
    ]);
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Ana Silva');
  });

  it('treats a participant from another organisation as not found', async () => {
    await setUp('another-organisation');
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain("doesn't exist here");
  });

  it('says so when the participant does not exist', async () => {
    await setUp('o1', () => api.getParticipant$.mockImplementation(failWith(404)));
    expect(element.querySelector('.detail-page__missing')?.textContent).toContain(
      "This participant doesn't exist here"
    );
    expect(element.querySelector('.detail-page__error')).toBeNull();
  });

  for (const [status, message] of [
    [429, RATE_LIMITED_MESSAGE],
    [403, FORBIDDEN_LOAD_MESSAGE],
    [500, "Couldn't load this participant. Please try again."],
  ] as const) {
    it(`shows why the participant couldn't load (${status}) in place of the header`, async () => {
      await setUp('o1', () => api.getParticipant$.mockImplementation(failWith(status)));
      expect(text('.detail-page__error > span')).toEqual([message]);
      expect(element.querySelector('app-detail-header')).toBeNull();
      expect(element.querySelector('.detail-page__missing')).toBeNull();
    });
  }

  it('loads the participant again from Try again and shows the header once it arrives', async () => {
    await setUp('o1', () => api.getParticipant$.mockImplementation(failWith(429)));
    api.getParticipant$.mockReturnValue(of(sampleParticipant()));
    buttonWithText('Try again')!.click();
    await settle();
    expect(api.getParticipant$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.detail-page__error')).toBeNull();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Ana Silva');
  });
});
