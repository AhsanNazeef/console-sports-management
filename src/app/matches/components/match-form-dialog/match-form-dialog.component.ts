import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { ModalComponent } from '../../../common/components/modal/modal.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { fromDateTimeInputValue, toDateTimeInputValue } from '../../../common/utils/datetime.util';
import { Match, MatchFormValue, MatchSport, MatchTeam } from '../../models/match.model';
import { matchTitle } from '../../utils/match.util';

// "Schedule Match" / "Edit Match" popup. Scheduling picks a sport, then two of its teams, a date and time and
// an optional venue. Editing changes only the date, time and venue, which is what the API's PATCH takes.
@Component({
  selector: 'app-match-form-dialog',
  standalone: true,
  imports: [FormsModule, ButtonComponent, ModalComponent, TextInputComponent],
  templateUrl: './match-form-dialog.component.html',
  styleUrl: './match-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchFormDialogComponent {
  readonly open = input(false);
  // The match being edited, or null to schedule one.
  readonly match = input<Match | null>(null);
  // null while loading.
  readonly sports = input<readonly MatchSport[] | null>(null);
  // The chosen sport's teams; null until they arrive.
  readonly teams = input<readonly MatchTeam[] | null>(null);
  readonly optionsError = input<string | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly sportChange = output<string>();
  readonly save = output<MatchFormValue>();
  readonly cancelled = output<void>();

  // Fields reset each time the popup opens; the teams also reset when the sport changes.
  private readonly reset = computed(() => ({ open: this.open(), match: this.match() }));
  readonly sportId = linkedSignal({ source: this.reset, computation: () => '' });
  private readonly teamReset = computed(() => ({ reset: this.reset(), sportId: this.sportId() }));
  readonly homeTeamId = linkedSignal({ source: this.teamReset, computation: () => '' });
  readonly awayTeamId = linkedSignal({ source: this.teamReset, computation: () => '' });
  readonly scheduledAt = linkedSignal({
    source: this.reset,
    computation: ({ match }) => toDateTimeInputValue(match?.scheduledAt),
  });
  readonly venue = linkedSignal({ source: this.reset, computation: ({ match }) => match?.venue ?? '' });

  readonly heading = computed(() => (this.match() ? 'Edit Match' : 'Schedule Match'));
  readonly editingTitle = computed(() => {
    const match = this.match();
    return match ? matchTitle(match) : '';
  });
  readonly teamsLoading = computed(() => !!this.sportId() && this.teams() === null && !this.optionsError());
  readonly tooFewTeams = computed(() => !!this.sportId() && (this.teams()?.length ?? 2) < 2);

  // Shown as soon as both are picked, before submitting.
  readonly sameTeamError = computed(() =>
    this.homeTeamId() && this.homeTeamId() === this.awayTeamId() ? 'Home and away must be different teams.' : null
  );
  readonly scheduledAtError = computed(() =>
    fromDateTimeInputValue(this.scheduledAt()) ? null : 'Choose a date and time.'
  );
  readonly canSave = computed(() => {
    const teamsChosen = !!this.match() || (!!this.homeTeamId() && !!this.awayTeamId() && !this.sameTeamError());
    return teamsChosen && !this.scheduledAtError() && !this.saving();
  });

  shownError(control: NgModel, error: string | null): string | null {
    return control.touched ? error : null;
  }

  selectSport(sportId: string): void {
    this.sportId.set(sportId);
    this.sportChange.emit(sportId);
  }

  onSubmit(): void {
    const scheduledAt = fromDateTimeInputValue(this.scheduledAt());
    if (!this.canSave() || !scheduledAt) {
      return;
    }
    this.save.emit({
      sportId: this.sportId(),
      homeTeamId: this.homeTeamId(),
      awayTeamId: this.awayTeamId(),
      scheduledAt,
      venue: this.venue().trim(),
    });
  }
}
