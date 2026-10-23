import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';

export interface EntityFormValue {
  name: string;
  // The optional second field: Country for a governing body, City for an organisation.
  detail: string;
}

// "Add Governing Body" / "Add Organisation" popup: a required name and one optional detail.
@Component({
  selector: 'app-entity-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, TextInputComponent],
  templateUrl: './entity-form-dialog.component.html',
  styleUrl: './entity-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityFormDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly namePlaceholder = input('Name');
  readonly detailLabel = input.required<string>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly save = output<EntityFormValue>();
  readonly cancelled = output<void>();

  // Fields start empty each time the popup opens.
  readonly name = linkedSignal({ source: this.open, computation: () => '' });
  readonly detail = linkedSignal({ source: this.open, computation: () => '' });

  readonly nameError = computed(() => (this.name().trim() ? null : 'Enter a name.'));
  readonly canSave = computed(() => !this.nameError() && !this.saving());

  shownError(control: NgModel, error: string | null): string | null {
    return control.dirty && control.touched ? error : null;
  }

  onSubmit(): void {
    if (this.canSave()) {
      this.save.emit({ name: this.name().trim(), detail: this.detail().trim() });
    }
  }
}
