import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { DataTableColumn, DataTableComponent } from '../../../common/components/data-table/data-table.component';
import { DialogComponent } from '../../../common/components/dialog/dialog.component';
import { EntityAvatarComponent } from '../../../common/components/entity-avatar/entity-avatar.component';
import { formatDate } from '../../../common/utils/datetime.util';
import { describeHttpError } from '../../../common/utils/http-error.util';
import { createReloadable } from '../../../common/utils/reloadable.util';
import { SquadMember, SquadMemberFormValue } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { SquadMemberFormDialogComponent } from '../squad-member-form-dialog/squad-member-form-dialog.component';

// The Squad tab of an organisation (Figma Organisation panel "Squad" page): its members, added from user accounts.
// Photo and age come from each member's athlete profile; without one they show a placeholder.
@Component({
  selector: 'app-squad-panel',
  standalone: true,
  imports: [
    ButtonComponent,
    DataTableComponent,
    DialogComponent,
    EntityAvatarComponent,
    SquadMemberFormDialogComponent,
  ],
  templateUrl: './squad-panel.component.html',
  styleUrl: './squad-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SquadPanelComponent {
  private readonly membersApi = inject(MembersApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly organisationId = input.required<string>();
  readonly canEdit = input(false);

  readonly squad = createReloadable((id) => this.membersApi.getSquad$(id), this.organisationId);
  readonly columns = computed<DataTableColumn[]>(() => [
    { key: 'player', label: 'Player' },
    { key: 'position', label: 'Position', shaded: true },
    { key: 'age', label: 'Age', width: '80px' },
    { key: 'agreementEnd', label: 'Agreement End', shaded: true, width: '160px' },
    ...(this.canEdit() ? [{ key: 'actions', label: 'Actions', width: '88px' }] : []),
  ]);
  readonly failed = computed(() => this.squad.errorStatus() !== null && !this.squad.value());
  readonly emptyMessage = computed(() => (this.failed() ? 'The squad could not be loaded.' : 'No squad members yet.'));

  readonly formOpen = signal(false);
  readonly editing = signal<SquadMember | null>(null);
  readonly removing = signal<SquadMember | null>(null);
  readonly isSaving = signal(false);
  readonly actionError = signal<string | null>(null);

  readonly formatDate = formatDate;

  openAdd(): void {
    this.editing.set(null);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  openEdit(member: SquadMember): void {
    this.editing.set(member);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.isSaving()) {
      this.formOpen.set(false);
    }
  }

  save({ userId, position, agreementEnd }: SquadMemberFormValue): void {
    const editing = this.editing();
    const request$ = editing
      ? this.membersApi.updateSquadMember$(editing.id, { position, agreementEnd })
      : this.membersApi.addSquadMember$(this.organisationId(), {
          userId: userId ?? '',
          position,
          ...(agreementEnd ? { agreementEnd } : {}),
        });
    this.isSaving.set(true);
    this.actionError.set(null);
    request$
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          this.squad.reload();
        },
        error: (error: unknown) => this.actionError.set(this.describeError(error, "Couldn't save the squad member.")),
      });
  }

  askToRemove(member: SquadMember): void {
    this.actionError.set(null);
    this.removing.set(member);
  }

  cancelRemove(): void {
    if (!this.isSaving()) {
      this.removing.set(null);
    }
  }

  remove(): void {
    const member = this.removing();
    if (!member || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.actionError.set(null);
    this.membersApi
      .removeSquadMember$(member.id)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.removing.set(null);
          this.squad.reload();
        },
        error: (error: unknown) => this.actionError.set(this.describeError(error, "Couldn't remove the member.")),
      });
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.squad.reload();
      return 'This member is no longer in the squad. Someone may have removed them.';
    }
    return describeHttpError(error, `${fallback} Please try again.`);
  }
}
