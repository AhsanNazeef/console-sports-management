import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { USER_SEARCH_DEBOUNCE_MS } from '../../constants/members.constants';
import { UserSummary } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { UserPickerComponent } from './user-picker.component';

const ADA: UserSummary = { id: 'u1', email: 'ada@buzzer.dev', firstName: 'Ada', lastName: 'Admin', avatarUrl: null };

describe('UserPickerComponent', () => {
  let fixture: ComponentFixture<UserPickerComponent>;
  let element: HTMLElement;
  let searchUsers$: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    searchUsers$ = vi.fn((term: string) => of(term === 'ada' ? [ADA] : []));
    await TestBed.configureTestingModule({
      imports: [UserPickerComponent],
      providers: [{ provide: MembersApiService, useValue: { searchUsers$ } }],
    }).compileComponents();
    fixture = TestBed.createComponent(UserPickerComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const type = async (value: string): Promise<void> => {
    const input = element.querySelector('input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, USER_SEARCH_DEBOUNCE_MS + 50));
    await fixture.whenStable();
  };

  it('waits for two letters before searching', async () => {
    await type('a');
    expect(searchUsers$).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Type at least 2 letters');
  });

  it('searches the server and picks a user from the matches', async () => {
    await type('ada');
    expect(searchUsers$).toHaveBeenCalledWith('ada');
    const option = element.querySelector('.user-picker__option') as HTMLButtonElement;
    expect(option.querySelector('.user-picker__name')?.textContent).toBe('Ada Admin');
    expect(option.querySelector('.user-picker__email')?.textContent).toBe('ada@buzzer.dev');
    expect(option.getAttribute('aria-label')).toBe('Ada Admin, ada@buzzer.dev');

    option.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toEqual(ADA);
    expect(option.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('.user-picker__selected')?.textContent).toContain('Ada Admin');
  });

  it('says so when nobody matches', async () => {
    await type('zed');
    expect(element.textContent).toContain('No users match “zed”.');
  });
});
