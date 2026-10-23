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
import { StatCardComponent } from '../../common/components/stat-card/stat-card.component';
import { formatDateTime } from '../../common/utils/datetime.util';
import { createPagedList } from '../../common/utils/paged-list.util';
import { createReloadable } from '../../common/utils/reloadable.util';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  EntityFormDialogComponent,
  EntityFormValue,
} from '../components/entity-form-dialog/entity-form-dialog.component';
import { CATALOGUE_EDITOR_ROLES, DEFAULT_CHILD_QUERY, SPORTS_PAGE_SIZE } from '../constants/sports.constants';
import { ChildListQuery, Organisation } from '../models/hierarchy.model';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { describeCreateError, isMissing } from '../utils/hierarchy-errors.util';
import { organisationLink, sportLink } from '../utils/hierarchy-links.util';

@Component({
  selector: 'app-governing-body-detail-page',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    DataTableComponent,
    DetailHeaderComponent,
    EntityAvatarComponent,
    EntityFormDialogComponent,
    PaginationComponent,
    RouterLink,
    StatCardComponent,
  ],
  templateUrl: './governing-body-detail.component.html',
  styleUrl: './governing-body-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoverningBodyDetailPage {
  private readonly hierarchyApi = inject(HierarchyApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // From the route (/sports/:sportId/governing-bodies/:governingBodyId).
  readonly sportId = input.required<string>();
  readonly governingBodyId = input.required<string>();

  readonly pageSize = SPORTS_PAGE_SIZE;
  readonly canEdit = computed(() => this.authService.hasAnyRole(CATALOGUE_EDITOR_ROLES));
  // Figma's "Competitions" table.
  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Organisations' },
    { key: 'participants', label: 'Participants', shaded: true },
  ];

  readonly governingBody = createReloadable((id) => this.hierarchyApi.getGoverningBody$(id), this.governingBodyId);
  readonly counts = createReloadable((id) => this.hierarchyApi.getGoverningBodyCounts$(id), this.governingBodyId);
  readonly organisations = createPagedList<Organisation, ChildListQuery>({
    initialQuery: DEFAULT_CHILD_QUERY,
    load: (query, governingBodyId) => this.hierarchyApi.getOrganisations$(governingBodyId, query),
    parentId: this.governingBodyId,
  });

  readonly formOpen = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  // Missing, or not under the sport in the address.
  readonly notFound = computed(() => {
    const governingBody = this.governingBody.value();
    return governingBody ? governingBody.sportId !== this.sportId() : isMissing(this.governingBody.errorStatus());
  });
  readonly sportLink = computed(() => sportLink(this.sportId()));
  readonly breadcrumbs = computed<Breadcrumb[]>(() => {
    const governingBody = this.governingBody.value();
    return [
      { label: 'Sport', link: '/sports' },
      { label: governingBody?.sport?.name ?? '…', link: this.sportLink() },
      { label: governingBody?.name ?? '…' },
    ];
  });
  readonly fields = computed<DetailField[]>(() => {
    const governingBody = this.governingBody.value();
    return [
      { label: 'Country:', value: governingBody?.country ?? null },
      { label: 'Created:', value: formatDateTime(governingBody?.createdAt) },
      { label: 'Updated:', value: formatDateTime(governingBody?.updatedAt) },
    ];
  });
  readonly emptyMessage = computed(() => {
    if (this.organisations.failed()) return 'Organisations could not be loaded.';
    const search = this.organisations.query().search;
    return search ? `No organisations match “${search}”.` : 'No organisations yet.';
  });

  linkTo(organisation: Organisation): string {
    return organisationLink(this.sportId(), this.governingBodyId(), organisation.id);
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

  addOrganisation({ name, detail }: EntityFormValue): void {
    this.isSaving.set(true);
    this.saveError.set(null);
    this.hierarchyApi
      .createOrganisation$({ name, governingBodyId: this.governingBodyId(), ...(detail ? { city: detail } : {}) })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          this.organisations.goToPage(1);
          this.organisations.reload();
          this.counts.reload();
        },
        error: (error: unknown) => this.saveError.set(describeCreateError(error, 'organisation', name)),
      });
  }
}
