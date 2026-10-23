import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewParticipant, Team } from '../../models/hierarchy.model';
import { NEW_TEAM, ParticipantFormDialogComponent } from './participant-form-dialog.component';

const team = (id: string, name: string): Team => ({
  id,
  name,
  shortName: null,
  logoUrl: null,
  organizationId: 'o1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

describe('ParticipantFormDialogComponent', () => {
  let fixture: ComponentFixture<ParticipantFormDialogComponent>;
  let element: HTMLElement;
  let saved: NewParticipant[];

  async function open(teams: Team[]): Promise<void> {
    await TestBed.configureTestingModule({ imports: [ParticipantFormDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(ParticipantFormDialogComponent);
    fixture.componentRef.setInput('teams', teams);
    fixture.componentRef.setInput('open', true);
    saved = [];
    fixture.componentInstance.save.subscribe((value) => saved.push(value));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  const type = (selector: string, value: string): void => {
    const field = element.querySelector(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const choose = async (value: string): Promise<void> => {
    const select = element.querySelector('#participant-team') as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const submit = (): HTMLButtonElement => element.querySelector('button[type="submit"]') as HTMLButtonElement;

  it('adds a participant to the first team by default, with the optional details', async () => {
    await open([team('t1', 'First XI'), team('t2', 'Reserves')]);
    expect((element.querySelector('#participant-team') as HTMLSelectElement).value).toBe('t1');
    type('#participant-first-name', 'Ana');
    type('#participant-last-name', 'Silva');
    type('#participant-position', 'Forward');
    type('#participant-jersey', '9');
    submit().click();
    expect(saved).toEqual([
      {
        participant: { firstName: 'Ana', lastName: 'Silva', position: 'Forward', jerseyNumber: 9 },
        teamId: 't1',
        newTeamName: null,
      },
    ]);
  });

  it('can put the participant in a new team instead', async () => {
    await open([team('t1', 'First XI')]);
    await choose(NEW_TEAM);
    type('#participant-first-name', 'Ana');
    type('#participant-last-name', 'Silva');
    expect(submit().disabled).toBe(true);
    type('#participant-new-team', 'Under 21');
    submit().click();
    expect(saved[0]).toEqual({
      participant: { firstName: 'Ana', lastName: 'Silva' },
      teamId: null,
      newTeamName: 'Under 21',
    });
  });

  it('asks for a first team when the organisation has none', async () => {
    await open([]);
    expect(element.textContent).toContain('This organisation has no teams yet.');
    expect(element.querySelector('#participant-new-team')).toBeTruthy();
  });

  it('rejects a jersey number that is not a whole number', async () => {
    await open([team('t1', 'First XI')]);
    type('#participant-first-name', 'Ana');
    type('#participant-last-name', 'Silva');
    type('#participant-jersey', '9.5');
    expect(element.textContent).toContain('Use a whole number from 0 to 999.');
    expect(submit().disabled).toBe(true);
  });
});
