import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Breadcrumb, BreadcrumbsComponent } from '../../common/components/breadcrumbs/breadcrumbs.component';
import { ButtonComponent } from '../../common/components/button/button.component';
import { DataTableColumn, DataTableComponent } from '../../common/components/data-table/data-table.component';
import { DetailField, DetailHeaderComponent } from '../../common/components/detail-header/detail-header.component';
import { EntityAvatarComponent } from '../../common/components/entity-avatar/entity-avatar.component';
import { PaginationComponent } from '../../common/components/pagination/pagination.component';
import { formatDateTime } from '../../common/utils/datetime.util';
import { createPagedList } from '../../common/utils/paged-list.util';
import { createReloadable } from '../../common/utils/reloadable.util';
import { AuthService } from '../../core/auth/services/auth.service';
import { ParticipantFormDialogComponent } from '../components/participant-form-dialog/participant-form-dialog.component';
import { CATALOGUE_EDITOR_ROLES, DEFAULT_CHILD_QUERY, SPORTS_PAGE_SIZE } from '../constants/sports.constants';
import { ChildListQuery, NewParticipant, Participant } from '../models/hierarchy.model';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { describeCreateError, isMissing } from '../utils/hierarchy-errors.util';
import { governingBodyLink, participantLink, sportLink } from '../utils/hierarchy-links.util';

@Component({
  selector: 'app-organisation-detail-page',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    DataTableComponent,
    DetailHeaderComponent,
    EntityAvatarComponent,
    PaginationComponent,
    ParticipantFormDialogComponent,
    RouterLink,
  ],
  templateUrl: './organisation-detail.component.html',
  styleUrl: './organisation-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganisationDetailPage {
  private readonly sportsApi = inject(SportsApiService);
  private readonly hierarchyApi = inject(HierarchyApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // From the route (/sports/:sportId/governing-bodies/:governingBodyId/organisations/:organisationId).
  readonly sportId = input.required<string>();
  readonly governingBodyId = input.required<string>();
  readonly organisationId = input.required<string>();

  readonly pageSize = SPORTS_PAGE_SIZE;
  readonly canEdit = computed(() => this.authService.hasAnyRole(CATALOGUE_EDITOR_ROLES));
  // Figma's "Participants" table. Team, position and jersey number are on the participant's own page.
  readonly columns: DataTableColumn[] = [{ key: 'name', label: 'Participants' }];

  // The organisation (with its governing body and teams) and the sport, for the breadcrumbs.
  readonly organisation = createReloadable((id) => this.hierarchyApi.getOrganisation$(id), this.organisationId);
  readonly sport = createReloadable((id) => this.sportsApi.getSport$(id), this.sportId);
  readonly participants = createPagedList<Participant, ChildListQuery>({
    initialQuery: DEFAULT_CHILD_QUERY,
    load: (query, organisationId) => this.hierarchyApi.getParticipants$(organisationId, query),
    parentId: this.organisationId,
  });

  readonly formOpen = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  // Missing, or not under the governing body in the address.
  readonly notFound = computed(() => {
    const organisation = this.organisation.value();
    return organisation
      ? organisation.governingBodyId !== this.governingBodyId()
      : isMissing(this.organisation.errorStatus());
  });
  readonly governingBodyLink = computed(() => governingBodyLink(this.sportId(), this.governingBodyId()));
  readonly breadcrumbs = computed<Breadcrumb[]>(() => {
    const organisation = this.organisation.value();
    return [
      { label: 'Sport', link: '/sports' },
      { label: this.sport.value()?.name ?? '…', link: sportLink(this.sportId()) },
      { label: organisation?.governingBody?.name ?? '…', link: this.governingBodyLink() },
      { label: organisation?.name ?? '…' },
    ];
  });
  readonly fields = computed<DetailField[]>(() => {
    const organisation = this.organisation.value();
    return [
      { label: 'City:', value: organisation?.city ?? null },
      { label: 'Country:', value: organisation?.country ?? null },
      { label: 'Type:', value: organisation?.type ?? null },
      { label: 'Created:', value: formatDateTime(organisation?.createdAt) },
      { label: 'Updated:', value: formatDateTime(organisation?.updatedAt) },
    ];
  });
  readonly emptyMessage = computed(() => {
    if (this.participants.failed()) return 'Participants could not be loaded.';
    const search = this.participants.query().search;
    return search ? `No participants match “${search}”.` : 'No participants yet.';
  });

  fullName(participant: Participant): string {
    return `${participant.firstName} ${participant.lastName}`.trim();
  }

  linkTo(participant: Participant): string {
    return participantLink(this.sportId(), this.governingBodyId(), this.organisationId(), participant.id);
  }

  openAdd(): void {
    this.saveError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.isSaving()) {
      this.formOpen.set(false);
    }
  }

  addParticipant(request: NewParticipant): void {
    this.isSaving.set(true);
    this.saveError.set(null);
    const name = `${request.participant.firstName} ${request.participant.lastName}`;
    this.hierarchyApi
      .createParticipant$(this.organisationId(), request)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          this.participants.goToPage(1);
          this.participants.reload();
          // A new team may have been created on the way.
          this.organisation.reload();
        },
        error: (error: unknown) => this.saveError.set(describeCreateError(error, 'participant', name)),
      });
  }
}
