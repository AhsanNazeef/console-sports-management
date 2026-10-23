import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaffMember, StaffMemberInput } from '../../models/member.model';
import { StaffMemberFormDialogComponent } from './staff-member-form-dialog.component';

const MEMBER: StaffMember = {
  id: 's1',
  organizationId: 'o1',
  name: 'Cora President',
  roleTitle: 'Club President',
  category: 'club_president',
  nationality: 'England',
  photoUrl: 'https://cdn.example.com/cora.jpg',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('StaffMemberFormDialogComponent', () => {
  let fixture: ComponentFixture<StaffMemberFormDialogComponent>;
  let element: HTMLElement;
  let saved: ReturnType<typeof vi.fn<(value: StaffMemberInput) => void>>;

  async function setUp(member: StaffMember | null): Promise<void> {
    await TestBed.configureTestingModule({ imports: [StaffMemberFormDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(StaffMemberFormDialogComponent);
    fixture.componentRef.setInput('member', member);
    fixture.componentRef.setInput('category', 'operations_administration');
    fixture.componentRef.setInput('open', true);
    saved = vi.fn<(value: StaffMemberInput) => void>();
    fixture.componentInstance.save.subscribe(saved);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  const save = (): HTMLButtonElement => element.querySelector('button[type="submit"]') as HTMLButtonElement;
  const typeInto = async (selector: string, value: string): Promise<void> => {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };

  it('adds a member to the section it was opened from, leaving empty optional fields out', async () => {
    await setUp(null);
    expect(element.querySelector('h2')?.textContent).toBe('Add Staff Member');
    expect((element.querySelector('#staff-member-category') as HTMLSelectElement).value).toBe(
      'operations_administration'
    );
    expect(save().disabled).toBe(true);

    await typeInto('#staff-member-name', 'Joshua Kalim');
    await typeInto('#staff-member-role', 'Team Manager');
    save().click();
    expect(saved).toHaveBeenCalledWith({
      name: 'Joshua Kalim',
      roleTitle: 'Team Manager',
      category: 'operations_administration',
      nationality: null,
      photoUrl: null,
    });
  });

  it('asks for a full link before saving a photo URL', async () => {
    await setUp(null);
    await typeInto('#staff-member-name', 'Joshua Kalim');
    await typeInto('#staff-member-role', 'Team Manager');
    await typeInto('#staff-member-photo', 'photo.jpg');
    expect(save().disabled).toBe(true);
    expect(element.textContent).toContain('Enter a full link');
  });

  it('edits a member with their current values, and can clear the optional ones', async () => {
    await setUp(MEMBER);
    expect(element.querySelector('h2')?.textContent).toBe('Edit Staff Member');
    expect((element.querySelector('#staff-member-category') as HTMLSelectElement).value).toBe('club_president');

    await typeInto('#staff-member-nationality', '');
    save().click();
    expect(saved).toHaveBeenCalledWith({
      name: 'Cora President',
      roleTitle: 'Club President',
      category: 'club_president',
      nationality: null,
      photoUrl: 'https://cdn.example.com/cora.jpg',
    });
  });
});
