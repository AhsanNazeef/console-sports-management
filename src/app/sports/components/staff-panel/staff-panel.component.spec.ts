import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { StaffGroup, StaffMember } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { StaffPanelComponent } from './staff-panel.component';

const staffMember = (overrides: Partial<StaffMember> = {}): StaffMember => ({
  id: 's1',
  organizationId: 'o1',
  name: 'Ola Operations',
  roleTitle: 'President',
  category: 'club_president',
  nationality: 'Wales',
  photoUrl: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const groups = (presidents: StaffMember[]): StaffGroup[] => [
  { category: 'club_president', members: presidents },
  {
    category: 'executive_management',
    members: [staffMember({ id: 's2', name: 'Cora', category: 'executive_management' })],
  },
  { category: 'operations_administration', members: [] },
];

describe('StaffPanelComponent', () => {
  let fixture: ComponentFixture<StaffPanelComponent>;
  let element: HTMLElement;
  let api: {
    getStaffGroups$: ReturnType<typeof vi.fn>;
    addStaffMember$: ReturnType<typeof vi.fn>;
    updateStaffMember$: ReturnType<typeof vi.fn>;
    removeStaffMember$: ReturnType<typeof vi.fn>;
  };

  async function setUp(canEdit = true, adjust?: () => void): Promise<void> {
    api = {
      getStaffGroups$: vi.fn(() => of(groups([staffMember()]))),
      addStaffMember$: vi.fn(() => of(staffMember({ id: 's3' }))),
      updateStaffMember$: vi.fn(() => of(staffMember())),
      removeStaffMember$: vi.fn(() => of(undefined)),
    };
    adjust?.();
    await TestBed.configureTestingModule({
      imports: [StaffPanelComponent],
      providers: [{ provide: MembersApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(StaffPanelComponent);
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
  const text = (selector: string): string[] =>
    Array.from(element.querySelectorAll(selector)).map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '');

  it('shows one section per group, in the order the backend sends them', async () => {
    await setUp();
    expect(text('.staff-panel__title')).toEqual([
      'Club President',
      'Executive Management',
      'Operations & Administration',
    ]);
    expect(text('.staff-panel__card .staff-panel__details p')).toEqual([
      'Ola Operations',
      'President',
      'Wales',
      'Cora',
      'President',
      'Wales',
    ]);
    expect(text('.staff-panel__empty')).toEqual(['No members yet.']);
  });

  it('shows the three sections with placeholder cards until the staff arrive', async () => {
    await setUp(true, () => api.getStaffGroups$.mockReturnValue(new Subject<StaffGroup[]>()));
    expect(text('.staff-panel__title')).toEqual([
      'Club President',
      'Executive Management',
      'Operations & Administration',
    ]);
    expect(element.querySelectorAll('.staff-panel__card app-skeleton').length).toBe(9);
  });

  it('offers no changes to roles that cannot manage staff', async () => {
    await setUp(false);
    expect(element.textContent).not.toContain('Add Member');
    expect(element.querySelector('.staff-panel__action')).toBeNull();
  });

  it('adds a member to the section whose button was used', async () => {
    await setUp();
    const addButtons = Array.from(element.querySelectorAll('app-button')).filter((button) =>
      button.textContent?.includes('Add Member')
    );
    (addButtons[2].querySelector('button') as HTMLButtonElement).click();
    await settle();
    expect(fixture.componentInstance.addingTo()).toBe('operations_administration');
    expect(element.querySelector('app-staff-member-form-dialog h2')?.textContent).toBe('Add Staff Member');

    const input = {
      name: 'Tyron',
      roleTitle: 'Kit Manager',
      category: 'operations_administration' as const,
      nationality: null,
      photoUrl: null,
    };
    fixture.componentInstance.save(input);
    await settle();
    expect(api.addStaffMember$).toHaveBeenCalledWith('o1', input);
    expect(api.getStaffGroups$).toHaveBeenCalledTimes(2);
  });

  it('removes a member after confirmation and the card disappears', async () => {
    await setUp();
    (element.querySelector('[aria-label="Remove Ola Operations"]') as HTMLButtonElement).click();
    await settle();
    expect(element.querySelector('app-dialog h2')?.textContent).toBe('Remove Ola Operations from the staff?');

    api.getStaffGroups$.mockReturnValue(of(groups([])));
    (
      Array.from(element.querySelectorAll('app-dialog button')).find(
        (b) => b.textContent?.trim() === 'Remove'
      ) as HTMLButtonElement
    ).click();
    await settle();
    expect(api.removeStaffMember$).toHaveBeenCalledWith('s1');
    expect(text('.staff-panel__name')).toEqual(['Cora']);
  });
});
