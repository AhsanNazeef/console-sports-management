import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonComponent } from '../../../common/components/button/button.component';
import { DialogComponent } from '../../../common/components/dialog/dialog.component';
import { EntityAvatarComponent } from '../../../common/components/entity-avatar/entity-avatar.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { describeHttpError } from '../../../common/utils/http-error.util';
import { createReloadable } from '../../../common/utils/reloadable.util';
import { STAFF_CATEGORIES, STAFF_CATEGORY_LABELS } from '../../constants/members.constants';
import { StaffCategory, StaffMember, StaffMemberInput } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { StaffMemberFormDialogComponent } from '../staff-member-form-dialog/staff-member-form-dialog.component';

// The Staff tab of an organisation (Figma Organisation panel "Staff" page): one section per category.
// Sections come from the response's groups, which keep a stable order.
@Component({
  selector: 'app-staff-panel',
  standalone: true,
  imports: [ButtonComponent, DialogComponent, EntityAvatarComponent, SkeletonComponent, StaffMemberFormDialogComponent],
  templateUrl: './staff-panel.component.html',
  styleUrl: './staff-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPanelComponent {
  private readonly membersApi = inject(MembersApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly organisationId = input.required<string>();
  readonly canEdit = input(false);

  readonly staff = createReloadable((id) => this.membersApi.getStaffGroups$(id), this.organisationId);
  readonly failed = computed(() => this.staff.errorStatus() !== null && !this.staff.value());
  readonly labels = STAFF_CATEGORY_LABELS;
  // Sections drawn with placeholder cards until the first response arrives.
  readonly placeholderSections = STAFF_CATEGORIES;

  readonly formOpen = signal(false);
  readonly editing = signal<StaffMember | null>(null);
  readonly addingTo = signal<StaffCategory>('club_president');
  readonly removing = signal<StaffMember | null>(null);
  readonly isSaving = signal(false);
  readonly actionError = signal<string | null>(null);

  openAdd(category: StaffCategory): void {
    this.editing.set(null);
    this.addingTo.set(category);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  openEdit(member: StaffMember): void {
    this.editing.set(member);
    this.actionError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.isSaving()) {
      this.formOpen.set(false);
    }
  }

  save(input: StaffMemberInput): void {
    const editing = this.editing();
    const request$ = editing
      ? this.membersApi.updateStaffMember$(editing.id, input)
      : this.membersApi.addStaffMember$(this.organisationId(), input);
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
          this.staff.reload();
        },
        error: (error: unknown) => this.actionError.set(this.describeError(error, "Couldn't save the staff member.")),
      });
  }

  askToRemove(member: StaffMember): void {
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
      .removeStaffMember$(member.id)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.removing.set(null);
          this.staff.reload();
        },
        error: (error: unknown) => this.actionError.set(this.describeError(error, "Couldn't remove the staff member.")),
      });
  }

  private describeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.staff.reload();
      return 'This staff member no longer exists. Someone may have removed them.';
    }
    return describeHttpError(error, `${fallback} Please try again.`);
  }
}
