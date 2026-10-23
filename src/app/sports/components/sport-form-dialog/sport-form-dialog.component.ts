import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { isWebUrl } from '../../../common/utils/url.util';
import { Sport, SportInput } from '../../models/sport.model';

// Add and Edit Sport popup. Pass a sport to edit it, or null to add one.
@Component({
  selector: 'app-sport-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, TextInputComponent],
  templateUrl: './sport-form-dialog.component.html',
  styleUrl: './sport-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportFormDialogComponent {
  readonly open = input(false);
  readonly sport = input<Sport | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly save = output<SportInput>();
  readonly cancelled = output<void>();

  // Field values start from the sport being edited and reset each time the popup opens.
  private readonly initial = computed(() => {
    const sport = this.open() ? this.sport() : null;
    return { name: sport?.name ?? '', description: sport?.description ?? '', iconUrl: sport?.iconUrl ?? '' };
  });
  readonly name = linkedSignal(() => this.initial().name);
  readonly description = linkedSignal(() => this.initial().description);
  readonly iconUrl = linkedSignal(() => this.initial().iconUrl);
  readonly iconFailed = linkedSignal(() => {
    this.iconUrl();
    return false;
  });

  readonly nameError = computed(() => (this.name().trim() ? null : 'Enter a sport name.'));
  readonly iconUrlError = computed(() => {
    const url = this.iconUrl().trim();
    if (!url) {
      // The API rejects empty or null icon URLs, so an icon can be replaced but not removed.
      return this.sport()?.iconUrl ? "The icon can't be removed, only replaced with another link." : null;
    }
    return isWebUrl(url) ? null : 'Enter a full link starting with https://';
  });
  readonly previewUrl = computed(() => {
    const url = this.iconUrl().trim();
    return url && !this.iconUrlError() && !this.iconFailed() ? url : null;
  });
  readonly canSave = computed(() => !this.nameError() && !this.iconUrlError() && !this.saving());

  // Errors show once the user has typed in a field and left it, like the login form.
  shownError(control: NgModel, error: string | null): string | null {
    return control.dirty && control.touched ? error : null;
  }

  onSubmit(): void {
    if (!this.canSave()) {
      return;
    }
    const input: SportInput = { name: this.name().trim() };
    const description = this.description().trim();
    // When editing, an empty description is sent so the old one is cleared.
    if (description || this.sport()) {
      input.description = description;
    }
    const iconUrl = this.iconUrl().trim();
    if (iconUrl) {
      input.iconUrl = iconUrl;
    }
    this.save.emit(input);
  }
}
