import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { isWebUrl } from '../../../common/utils/url.util';
import { STAFF_CATEGORIES, STAFF_CATEGORY_LABELS } from '../../constants/members.constants';
import { StaffCategory, StaffMember, StaffMemberInput } from '../../models/member.model';

// "Add Staff Member" / "Edit Staff Member" popup. Adding starts in the section whose button was used.
@Component({
  selector: 'app-staff-member-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, TextInputComponent],
  templateUrl: './staff-member-form-dialog.component.html',
  styleUrl: './staff-member-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberFormDialogComponent {
  readonly open = input(false);
  // The member being edited, or null to add one in `category`.
  readonly member = input<StaffMember | null>(null);
  readonly category = input<StaffCategory>('club_president');
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly save = output<StaffMemberInput>();
  readonly cancelled = output<void>();

  readonly categories = STAFF_CATEGORIES.map((id) => ({ id, label: STAFF_CATEGORY_LABELS[id] }));

  // Fields reset each time the popup opens.
  private readonly reset = computed(() => ({ open: this.open(), member: this.member(), category: this.category() }));
  readonly name = linkedSignal({ source: this.reset, computation: ({ member }) => member?.name ?? '' });
  readonly roleTitle = linkedSignal({ source: this.reset, computation: ({ member }) => member?.roleTitle ?? '' });
  readonly categoryChoice = linkedSignal({
    source: this.reset,
    computation: ({ member, category }) => member?.category ?? category,
  });
  readonly nationality = linkedSignal({ source: this.reset, computation: ({ member }) => member?.nationality ?? '' });
  readonly photoUrl = linkedSignal({ source: this.reset, computation: ({ member }) => member?.photoUrl ?? '' });

  readonly heading = computed(() => (this.member() ? 'Edit Staff Member' : 'Add Staff Member'));
  readonly nameError = computed(() => (this.name().trim() ? null : 'Enter a name.'));
  readonly roleTitleError = computed(() => (this.roleTitle().trim() ? null : 'Enter a role, such as CEO.'));
  readonly photoUrlError = computed(() => {
    const url = this.photoUrl().trim();
    return !url || isWebUrl(url) ? null : 'Enter a full link, starting with https://';
  });
  readonly canSave = computed(
    () => !this.nameError() && !this.roleTitleError() && !this.photoUrlError() && !this.saving()
  );

  shownError(control: NgModel, error: string | null): string | null {
    return control.dirty && control.touched ? error : null;
  }

  onSubmit(): void {
    if (!this.canSave()) {
      return;
    }
    this.save.emit({
      name: this.name().trim(),
      roleTitle: this.roleTitle().trim(),
      category: this.categoryChoice(),
      nationality: this.nationality().trim() || null,
      photoUrl: this.photoUrl().trim() || null,
    });
  }
}
