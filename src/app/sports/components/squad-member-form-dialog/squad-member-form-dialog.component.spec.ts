import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SquadMember, SquadMemberFormValue, UserSummary } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { SquadMemberFormDialogComponent } from './squad-member-form-dialog.component';

const ADA: UserSummary = { id: 'u1', email: 'ada@buzzer.dev', firstName: 'Ada', lastName: 'Admin', avatarUrl: null };
const MEMBER: SquadMember = {
  id: 'm1',
  organizationId: 'o1',
  userId: 'u2',
  position: 'Forward',
  agreementEnd: '2027-06-30T00:00:00.000Z',
  displayName: 'Pat Player',
  email: 'pat@buzzer.dev',
  photoUrl: null,
  age: 29,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('SquadMemberFormDialogComponent', () => {
  let fixture: ComponentFixture<SquadMemberFormDialogComponent>;
  let element: HTMLElement;
  let saved: ReturnType<typeof vi.fn<(value: SquadMemberFormValue) => void>>;

  async function setUp(member: SquadMember | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [SquadMemberFormDialogComponent],
      providers: [{ provide: MembersApiService, useValue: { searchUsers$: () => of([ADA]) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(SquadMemberFormDialogComponent);
    fixture.componentRef.setInput('member', member);
    fixture.componentRef.setInput('open', true);
    saved = vi.fn<(value: SquadMemberFormValue) => void>();
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
    await fixture.whenStable();
  };

  it('adds a picked user with a position and an optional agreement end', async () => {
    await setUp(null);
    expect(element.querySelector('h2')?.textContent).toBe('Add Squad Member');
    await typeInto('#squad-member-position', 'Defender');
    expect(save().disabled).toBe(true);

    fixture.componentInstance.user.set(ADA);
    await fixture.whenStable();
    expect(save().disabled).toBe(false);
    await typeInto('#squad-member-agreement-end', '2028-12-31');
    save().click();
    expect(saved).toHaveBeenCalledWith({ userId: 'u1', position: 'Defender', agreementEnd: '2028-12-31' });
  });

  it('edits the position and clears the agreement end of an existing member', async () => {
    await setUp(MEMBER);
    expect(element.querySelector('h2')?.textContent).toBe('Edit Squad Member');
    expect(element.querySelector('app-user-picker')).toBeNull();
    expect(element.querySelector('.squad-form__player')?.textContent).toContain('Pat Player');
    expect((element.querySelector('#squad-member-agreement-end') as HTMLInputElement).value).toBe('2027-06-30');

    await typeInto('#squad-member-agreement-end', '');
    save().click();
    expect(saved).toHaveBeenCalledWith({ userId: null, position: 'Forward', agreementEnd: null });
  });
});
