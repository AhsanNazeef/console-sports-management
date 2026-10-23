import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb, BreadcrumbsComponent } from '../../common/components/breadcrumbs/breadcrumbs.component';
import { DetailField, DetailHeaderComponent } from '../../common/components/detail-header/detail-header.component';
import { formatDateTime } from '../../common/utils/datetime.util';
import { createReloadable } from '../../common/utils/reloadable.util';
import { HierarchyApiService } from '../services/hierarchy-api.service';
import { SportsApiService } from '../services/sports-api.service';
import { isMissing } from '../utils/hierarchy-errors.util';
import { governingBodyLink, organisationLink, sportLink } from '../utils/hierarchy-links.util';

// The last level of the drill-down: one participant (a player) and the team they play for.
@Component({
  selector: 'app-participant-detail-page',
  standalone: true,
  imports: [BreadcrumbsComponent, DetailHeaderComponent, RouterLink],
  templateUrl: './participant-detail.component.html',
  styleUrl: './participant-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantDetailPage {
  private readonly sportsApi = inject(SportsApiService);
  private readonly hierarchyApi = inject(HierarchyApiService);

  // From the route (…/organisations/:organisationId/participants/:participantId).
  readonly sportId = input.required<string>();
  readonly governingBodyId = input.required<string>();
  readonly organisationId = input.required<string>();
  readonly participantId = input.required<string>();

  readonly participant = createReloadable((id) => this.hierarchyApi.getParticipant$(id), this.participantId);
  // For the breadcrumbs: the organisation brings its governing body's name.
  readonly organisation = createReloadable((id) => this.hierarchyApi.getOrganisation$(id), this.organisationId);
  readonly sport = createReloadable((id) => this.sportsApi.getSport$(id), this.sportId);

  readonly fullName = computed(() => {
    const participant = this.participant.value();
    return participant ? `${participant.firstName} ${participant.lastName}`.trim() : '';
  });
  // Missing, or not in the organisation in the address.
  readonly notFound = computed(() => {
    const participant = this.participant.value();
    return participant
      ? !!participant.team && participant.team.organizationId !== this.organisationId()
      : isMissing(this.participant.errorStatus());
  });
  readonly organisationLink = computed(() =>
    organisationLink(this.sportId(), this.governingBodyId(), this.organisationId())
  );
  readonly breadcrumbs = computed<Breadcrumb[]>(() => {
    const organisation = this.organisation.value();
    return [
      { label: 'Sport', link: '/sports' },
      { label: this.sport.value()?.name ?? '…', link: sportLink(this.sportId()) },
      {
        label: organisation?.governingBody?.name ?? '…',
        link: governingBodyLink(this.sportId(), this.governingBodyId()),
      },
      { label: organisation?.name ?? '…', link: this.organisationLink() },
      { label: this.fullName() || '…' },
    ];
  });
  readonly fields = computed<DetailField[]>(() => {
    const participant = this.participant.value();
    return [
      { label: 'Team:', value: participant?.team?.name ?? null },
      { label: 'Position:', value: participant?.position ?? null },
      { label: 'Jersey number:', value: participant?.jerseyNumber ?? null },
      { label: 'Created:', value: formatDateTime(participant?.createdAt) },
      { label: 'Updated:', value: formatDateTime(participant?.updatedAt) },
    ];
  });
}
