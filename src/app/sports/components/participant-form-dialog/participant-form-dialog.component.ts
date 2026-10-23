import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { NewParticipant, Team } from '../../models/hierarchy.model';

// Value of the team select that means "create a team with the name below".
export const NEW_TEAM = '__new__';

// "Add Participant" popup. A player must belong to a team, so the organisation's teams are offered,
// plus a new team (the only choice when the organisation has none yet).
@Component({
  selector: 'app-participant-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, TextInputComponent],
  templateUrl: './participant-form-dialog.component.html',
  styleUrl: './participant-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantFormDialogComponent {
  readonly open = input(false);
  readonly teams = input<readonly Team[]>([]);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly save = output<NewParticipant>();
  readonly cancelled = output<void>();

  readonly newTeam = NEW_TEAM;

  // Fields reset each time the popup opens; the team defaults to the first one, or a new team.
  private readonly reset = computed(() => ({ open: this.open(), teams: this.teams() }));
  readonly firstName = linkedSignal({ source: this.reset, computation: () => '' });
  readonly lastName = linkedSignal({ source: this.reset, computation: () => '' });
  readonly position = linkedSignal({ source: this.reset, computation: () => '' });
  readonly jerseyNumber = linkedSignal({ source: this.reset, computation: () => '' });
  readonly teamChoice = linkedSignal({ source: this.reset, computation: ({ teams }) => teams[0]?.id ?? NEW_TEAM });
  readonly newTeamName = linkedSignal({ source: this.reset, computation: () => '' });

  readonly firstNameError = computed(() => (this.firstName().trim() ? null : 'Enter a first name.'));
  readonly lastNameError = computed(() => (this.lastName().trim() ? null : 'Enter a last name.'));
  readonly newTeamError = computed(() =>
    this.teamChoice() === NEW_TEAM && !this.newTeamName().trim() ? 'Enter a name for the new team.' : null
  );
  readonly jerseyError = computed(() => {
    const value = this.jerseyNumber().trim();
    return !value || /^\d{1,3}$/.test(value) ? null : 'Use a whole number from 0 to 999.';
  });
  readonly canSave = computed(
    () =>
      !this.firstNameError() && !this.lastNameError() && !this.newTeamError() && !this.jerseyError() && !this.saving()
  );

  shownError(control: NgModel, error: string | null): string | null {
    return control.dirty && control.touched ? error : null;
  }

  onSubmit(): void {
    if (!this.canSave()) {
      return;
    }
    const participant: NewParticipant['participant'] = {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
    };
    const position = this.position().trim();
    if (position) {
      participant.position = position;
    }
    const jersey = this.jerseyNumber().trim();
    if (jersey) {
      participant.jerseyNumber = Number(jersey);
    }
    const creatingTeam = this.teamChoice() === NEW_TEAM;
    this.save.emit({
      participant,
      teamId: creatingTeam ? null : this.teamChoice(),
      newTeamName: creatingTeam ? this.newTeamName().trim() : null,
    });
  }
}
