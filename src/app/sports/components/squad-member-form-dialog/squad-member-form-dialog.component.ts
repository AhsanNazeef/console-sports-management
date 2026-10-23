import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { toDateInputValue } from '../../../common/utils/datetime.util';
import { SquadMember, SquadMemberFormValue, UserSummary } from '../../models/member.model';
import { UserPickerComponent } from '../user-picker/user-picker.component';

// "Add Squad Member" / "Edit Squad Member" popup. A new member is an existing user account found by search;
// after that only the position and the agreement end can change.
@Component({
  selector: 'app-squad-member-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, TextInputComponent, UserPickerComponent],
  templateUrl: './squad-member-form-dialog.component.html',
  styleUrl: './squad-member-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SquadMemberFormDialogComponent {
  readonly open = input(false);
  // The member being edited, or null to add one.
  readonly member = input<SquadMember | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly save = output<SquadMemberFormValue>();
  readonly cancelled = output<void>();

  // Fields reset each time the popup opens.
  private readonly reset = computed(() => ({ open: this.open(), member: this.member() }));
  readonly user = linkedSignal<{ open: boolean; member: SquadMember | null }, UserSummary | null>({
    source: this.reset,
    computation: () => null,
  });
  readonly position = linkedSignal({ source: this.reset, computation: ({ member }) => member?.position ?? '' });
  readonly agreementEnd = linkedSignal({
    source: this.reset,
    computation: ({ member }) => toDateInputValue(member?.agreementEnd),
  });

  readonly heading = computed(() => (this.member() ? 'Edit Squad Member' : 'Add Squad Member'));
  readonly positionError = computed(() => (this.position().trim() ? null : 'Enter a position.'));
  readonly canSave = computed(() => (!!this.member() || !!this.user()) && !this.positionError() && !this.saving());

  shownError(control: NgModel, error: string | null): string | null {
    return control.dirty && control.touched ? error : null;
  }

  onSubmit(): void {
    if (!this.canSave()) {
      return;
    }
    this.save.emit({
      userId: this.member() ? null : (this.user()?.id ?? null),
      position: this.position().trim(),
      agreementEnd: this.agreementEnd() || null,
    });
  }
}
