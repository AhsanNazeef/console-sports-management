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
import { ChildListQuery, GoverningBody } from '../models/hierarchy.model';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { describeCreateError, isMissing } from '../utils/hierarchy-errors.util';
import { governingBodyLink } from '../utils/hierarchy-links.util';

@Component({
  selector: 'app-sport-detail-page',
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
  templateUrl: './sport-detail.component.html',
  styleUrl: './sport-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportDetailPage {
  private readonly sportsApi = inject(SportsApiService);
  private readonly hierarchyApi = inject(HierarchyApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  // From the route (/sports/:sportId).
  readonly sportId = input.required<string>();

  readonly pageSize = SPORTS_PAGE_SIZE;
  readonly canEdit = computed(() => this.authService.hasAnyRole(CATALOGUE_EDITOR_ROLES));
  // Figma's "Main Entities" table.
  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Governing Bodies' },
    { key: 'organisations', label: 'Organisations', shaded: true },
    { key: 'participants', label: 'Participants' },
  ];

  readonly sport = createReloadable((id) => this.sportsApi.getSport$(id), this.sportId);
  readonly counts = createReloadable((id) => this.hierarchyApi.getSportCounts$(id), this.sportId);
  readonly governingBodies = createPagedList<GoverningBody, ChildListQuery>({
    initialQuery: DEFAULT_CHILD_QUERY,
    load: (query, sportId) => this.hierarchyApi.getGoverningBodies$(sportId, query),
    parentId: this.sportId,
  });

  readonly formOpen = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly notFound = computed(() => !this.sport.value() && isMissing(this.sport.errorStatus()));
  readonly breadcrumbs = computed<Breadcrumb[]>(() => [
    { label: 'Sport', link: '/sports' },
    { label: this.sport.value()?.name ?? '…' },
  ]);
  readonly fields = computed<DetailField[]>(() => {
    const sport = this.sport.value();
    return [
      { label: 'Created:', value: formatDateTime(sport?.createdAt) },
      { label: 'Updated:', value: formatDateTime(sport?.updatedAt) },
      { label: 'Description:', value: sport?.description ?? null },
    ];
  });
  readonly emptyMessage = computed(() => {
    if (this.governingBodies.failed()) return 'Governing bodies could not be loaded.';
    const search = this.governingBodies.query().search;
    return search ? `No governing bodies match “${search}”.` : 'No governing bodies yet.';
  });

  linkTo(governingBody: GoverningBody): string {
    return governingBodyLink(this.sportId(), governingBody.id);
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

  addGoverningBody({ name, detail }: EntityFormValue): void {
    this.isSaving.set(true);
    this.saveError.set(null);
    this.hierarchyApi
      .createGoverningBody$({ name, sportId: this.sportId(), ...(detail ? { country: detail } : {}) })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.formOpen.set(false);
          // The new governing body changes this sport's counts too.
          this.governingBodies.goToPage(1);
          this.governingBodies.reload();
          this.counts.reload();
        },
        error: (error: unknown) => this.saveError.set(describeCreateError(error, 'governing body', name)),
      });
  }
}
