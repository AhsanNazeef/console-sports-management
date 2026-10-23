import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SquadMember } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { SquadPanelComponent } from './squad-panel.component';

const member = (overrides: Partial<SquadMember> = {}): SquadMember => ({
  id: 'm1',
  organizationId: 'o1',
  userId: 'u1',
  position: 'Forward',
  agreementEnd: '2028-12-31T00:00:00.000Z',
  displayName: 'Pat Player',
  email: 'pat@buzzer.dev',
  photoUrl: 'https://cdn.example.com/pat.jpg',
  age: 29,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('SquadPanelComponent', () => {
  let fixture: ComponentFixture<SquadPanelComponent>;
  let element: HTMLElement;
  let api: {
    getSquad$: ReturnType<typeof vi.fn>;
    addSquadMember$: ReturnType<typeof vi.fn>;
    updateSquadMember$: ReturnType<typeof vi.fn>;
    removeSquadMember$: ReturnType<typeof vi.fn>;
  };

  async function setUp(canEdit = true): Promise<void> {
    api = {
      getSquad$: vi.fn(() =>
        of([member(), member({ id: 'm2', displayName: 'Ana', photoUrl: null, age: null, agreementEnd: null })])
      ),
      addSquadMember$: vi.fn(() => of(member({ id: 'm3' }))),
      updateSquadMember$: vi.fn(() => of(member())),
      removeSquadMember$: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [SquadPanelComponent],
      providers: [{ provide: MembersApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(SquadPanelComponent);
    fixture.componentRef.setInput('organisationId', 'o1');
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.autoDetectChanges();
    await settle();
    element = fixture.nativeElement as HTMLElement;
  }

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const cells = (): string[][] =>
    Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    );

  it('lists the squad, with placeholders where a member has no athlete profile', async () => {
    await setUp();
    expect(api.getSquad$).toHaveBeenCalledWith('o1');
    expect(cells()).toEqual([
      ['Pat Player', 'Forward', '29', 'Dec 31, 2028', ''],
      ['A Ana', 'Forward', '—', '—', ''],
    ]);
    expect(element.querySelector('tbody tr img')?.getAttribute('src')).toBe('https://cdn.example.com/pat.jpg');
  });

  it('shows no changes to roles that cannot manage the squad', async () => {
    await setUp(false);
    expect(element.textContent).not.toContain('Add Squad Member');
    expect(element.querySelector('.squad-panel__action')).toBeNull();
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Player',
      'Position',
      'Age',
      'Agreement End',
    ]);
  });

  it('adds a member without an agreement end, then reloads the squad', async () => {
    await setUp();
    fixture.componentInstance.openAdd();
    fixture.componentInstance.save({ userId: 'u9', position: 'Keeper', agreementEnd: null });
    await settle();
    expect(api.addSquadMember$).toHaveBeenCalledWith('o1', { userId: 'u9', position: 'Keeper' });
    expect(api.getSquad$).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.formOpen()).toBe(false);
  });

  it('removes a member after confirmation and the row disappears', async () => {
    await setUp();
    (element.querySelector('[aria-label="Remove Ana"]') as HTMLButtonElement).click();
    await settle();
    expect(element.querySelector('app-dialog h2')?.textContent).toBe('Remove Ana from the squad?');

    api.getSquad$.mockReturnValue(of([member()]));
    (
      Array.from(element.querySelectorAll('app-dialog button')).find(
        (b) => b.textContent?.trim() === 'Remove'
      ) as HTMLButtonElement
    ).click();
    await settle();
    expect(api.removeSquadMember$).toHaveBeenCalledWith('m2');
    expect(cells().map((row) => row[0])).toEqual(['Pat Player']);
    expect(element.querySelector('app-dialog h2')).toBeNull();
  });
});
