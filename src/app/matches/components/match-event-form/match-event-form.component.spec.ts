import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchPlayer, NewMatchEvent } from '../../models/match-event.model';
import { AWAY, HOME } from '../../testing/match.fixtures';
import { MatchEventFormComponent } from './match-event-form.component';

const PLAYERS: MatchPlayer[] = [
  { id: 'p1', firstName: 'Ivan', lastName: 'Gloves', jerseyNumber: 1, teamId: HOME.id },
  { id: 'p2', firstName: 'Ana', lastName: 'Silva', jerseyNumber: null, teamId: AWAY.id },
];

describe('MatchEventFormComponent', () => {
  let fixture: ComponentFixture<MatchEventFormComponent>;
  let element: HTMLElement;
  let added: NewMatchEvent[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MatchEventFormComponent] }).compileComponents();
    fixture = TestBed.createComponent(MatchEventFormComponent);
    added = [];
    fixture.componentInstance.add.subscribe((event) => added.push(event));
    fixture.componentRef.setInput('teams', [HOME, AWAY]);
    fixture.componentRef.setInput('players', PLAYERS);
    await render();
    element = fixture.nativeElement as HTMLElement;
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const select = (id: string): HTMLSelectElement => element.querySelector(`#${id}`) as HTMLSelectElement;
  const choose = async (id: string, value: string): Promise<void> => {
    select(id).value = value;
    select(id).dispatchEvent(new Event('change'));
    await render();
  };
  const type = async (id: string, value: string): Promise<void> => {
    const input = element.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await render();
  };
  const blur = async (id: string): Promise<void> => {
    element.querySelector(`#${id}`)?.dispatchEvent(new Event('blur'));
    await render();
  };
  // The error text the text input shows under the minute, if any.
  const minuteMessage = (): string =>
    element
      .querySelector('#event-minute')
      ?.closest('app-text-input')
      ?.querySelector('[role="alert"], .text-input__message')
      ?.textContent?.trim() ?? '';
  const addButton = (): HTMLButtonElement => element.querySelector('button[type="submit"]') as HTMLButtonElement;
  const options = (id: string): string[] =>
    Array.from(select(id).options).map((option) => option.textContent?.trim() ?? '');

  it('offers the nine event types, starting with a goal', () => {
    expect(options('event-type')).toEqual([
      'Goal',
      'Foul',
      'Substitution',
      'Yellow card',
      'Red card',
      'Timeout',
      'Penalty',
      'Injury',
      'Other',
    ]);
    expect(select('event-type').value).toBe('GOAL');
  });

  it('requires the team for a goal', async () => {
    await type('event-minute', '10');
    expect(element.querySelector('#event-team-hint')?.textContent).toBe('Choose the team that scored.');
    expect(addButton().disabled).toBe(true);

    await choose('event-team', HOME.id);
    expect(element.querySelector('#event-team-hint')).toBeNull();
    expect(addButton().disabled).toBe(false);
  });

  it('lets other events go without a team', async () => {
    await choose('event-type', 'FOUL');
    expect(options('event-team')[0]).toBe('No team');
    await type('event-minute', '30');
    expect(addButton().disabled).toBe(false);
    addButton().click();
    expect(added).toEqual([{ type: 'FOUL', minute: 30 }]);
  });

  it('offers only the chosen team’s players', async () => {
    expect(select('event-player').disabled).toBe(true);
    await choose('event-team', HOME.id);
    expect(options('event-player')).toEqual(['No player', 'Ivan Gloves (#1)']);
    await choose('event-team', AWAY.id);
    expect(options('event-player')).toEqual(['No player', 'Ana Silva']);
  });

  it('checks the minute, with messages short enough for its narrow field', async () => {
    await choose('event-team', HOME.id);
    await type('event-minute', '-3');
    await blur('event-minute');
    expect(addButton().disabled).toBe(true);
    expect(minuteMessage()).toBe('Use 0–999.');
    await type('event-minute', '');
    expect(minuteMessage()).toBe('Required.');
    await type('event-minute', '45');
    expect(addButton().disabled).toBe(false);
    expect(minuteMessage()).toBe('');
  });

  it('emits the event and clears the form when the page resets it', async () => {
    await type('event-minute', '12');
    await blur('event-minute');
    await choose('event-team', HOME.id);
    await choose('event-player', 'p1');
    await type('event-detail', '  Header  ');
    addButton().click();
    expect(added).toEqual([{ type: 'GOAL', minute: 12, teamId: HOME.id, playerId: 'p1', detail: 'Header' }]);

    fixture.componentRef.setInput('resetKey', 1);
    await render();
    expect((element.querySelector('#event-minute') as HTMLInputElement).value).toBe('');
    expect(select('event-team').value).toBe('');
    // The cleared minute isn't flagged until it's edited again.
    expect(minuteMessage()).toBe('');
  });
});
