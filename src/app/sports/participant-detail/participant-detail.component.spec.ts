import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { sampleOrganisation, sampleParticipant, sampleSport } from '../../../testing/hierarchy-fixtures';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { ParticipantDetailPage } from './participant-detail.component';

describe('ParticipantDetailPage', () => {
  let fixture: ComponentFixture<ParticipantDetailPage>;
  let element: HTMLElement;

  async function setUp(organisationId = 'o1'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ParticipantDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: HierarchyApiService,
          useValue: {
            getParticipant$: () => of(sampleParticipant()),
            getOrganisation$: () => of(sampleOrganisation()),
          },
        },
        { provide: SportsApiService, useValue: { getSport$: () => of(sampleSport()) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ParticipantDetailPage);
    fixture.componentRef.setInput('sportId', 's1');
    fixture.componentRef.setInput('governingBodyId', 'g1');
    fixture.componentRef.setInput('organisationId', organisationId);
    fixture.componentRef.setInput('participantId', 'p1');
    fixture.autoDetectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  it('shows the participant and their team', async () => {
    await setUp();
    expect(element.querySelector('app-detail-header h2')?.textContent).toBe('Ana Silva');
    const facts = Array.from(element.querySelectorAll('.detail-header__field')).map((field) =>
      field.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(facts.slice(0, 3)).toEqual(['Team: First XI', 'Position: Forward', 'Jersey number: 9']);
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
});
