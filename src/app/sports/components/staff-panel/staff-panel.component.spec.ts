import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { RATE_LIMITED_MESSAGE } from '../../../common/constants/http.constants';
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
  const failWith = (status: number) => () => throwError(() => new HttpErrorResponse({ status }));
  const buttonWithText = (label: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.trim() === label);
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

  for (const [status, message] of [
    [429, RATE_LIMITED_MESSAGE],
    [500, "Couldn't refresh the staff, so the list may be out of date. Please try again."],
  ] as const) {
    it(`says so when the staff can't be refreshed after a removal (${status}), and keeps the cards`, async () => {
      await setUp();
      (element.querySelector('[aria-label="Remove Ola Operations"]') as HTMLButtonElement).click();
      await settle();
      api.getStaffGroups$.mockImplementation(failWith(status));
      (
        Array.from(element.querySelectorAll('app-dialog button')).find(
          (b) => b.textContent?.trim() === 'Remove'
        ) as HTMLButtonElement
      ).click();
      await settle();
      expect(api.removeStaffMember$).toHaveBeenCalledWith('s1');
      expect(element.querySelector('.staff-panel__error > span')?.textContent).toBe(message);
      expect(text('.staff-panel__name')).toEqual(['Ola Operations', 'Cora']);

      api.getStaffGroups$.mockReturnValue(of(groups([])));
      buttonWithText('Try again')!.click();
      await settle();
      expect(element.querySelector('.staff-panel__error')).toBeNull();
      expect(text('.staff-panel__name')).toEqual(['Cora']);
    });
  }

  for (const [status, message] of [
    [429, RATE_LIMITED_MESSAGE],
    [500, "Couldn't load the staff. Please try again."],
  ] as const) {
    it(`shows why the staff couldn't load (${status})`, async () => {
      await setUp(true, () => api.getStaffGroups$.mockImplementation(failWith(status)));
      expect(element.querySelector('.staff-panel__error > span')?.textContent).toBe(message);
      expect(element.querySelector('.staff-panel__section')).toBeNull();
    });
  }

  it('loads the staff again from Try again', async () => {
    await setUp(true, () => api.getStaffGroups$.mockImplementation(failWith(429)));
    api.getStaffGroups$.mockReturnValue(of(groups([staffMember()])));
    buttonWithText('Try again')!.click();
    await settle();
    expect(api.getStaffGroups$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.staff-panel__error')).toBeNull();
    expect(text('.staff-panel__name')).toEqual(['Ola Operations', 'Cora']);
  });
});
