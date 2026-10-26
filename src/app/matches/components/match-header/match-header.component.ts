import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EntityAvatarComponent } from '../../../common/components/entity-avatar/entity-avatar.component';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { StatusTagComponent } from '../../../common/components/status-tag/status-tag.component';
import { formatDateTime } from '../../../common/utils/datetime.util';
import { MATCH_STATUS_LABELS, MATCH_STATUS_TONES } from '../../constants/matches.constants';
import { Match } from '../../models/match.model';

export interface MatchScore {
  home: number;
  away: number;
}

interface HeaderField {
  label: string;
  value: string | null;
}

// Header card of a match: sport, status, both teams around the score, then venue and times.
// Status buttons are projected with the `match-header-actions` attribute.
@Component({
  selector: 'app-match-header',
  standalone: true,
  imports: [EntityAvatarComponent, SkeletonComponent, StatusTagComponent],
  templateUrl: './match-header.component.html',
  styleUrl: './match-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchHeaderComponent {
  readonly match = input<Match | null>(null);
  // The current score, which can be newer than the match record's.
  readonly score = input<MatchScore | null>(null);

  readonly statusLabel = computed(() => {
    const match = this.match();
    return match ? MATCH_STATUS_LABELS[match.status] : '';
  });
  readonly statusTone = computed(() => {
    const match = this.match();
    return match ? MATCH_STATUS_TONES[match.status] : 'neutral';
  });
  // A match that never started has no score yet.
  readonly hasStarted = computed(() => !!this.match()?.startedAt);

  // startedAt shows once the match is live, finishedAt once it is finished.
  readonly fields = computed<HeaderField[]>(() => {
    const match = this.match();
    if (!match) {
      return [
        { label: 'Venue', value: null },
        { label: 'Scheduled', value: null },
      ];
    }
    const fields: HeaderField[] = [
      { label: 'Venue', value: match.venue || '—' },
      { label: 'Scheduled', value: formatDateTime(match.scheduledAt) ?? '—' },
    ];
    if (match.status === 'LIVE' || match.status === 'FINISHED') {
      fields.push({ label: 'Started', value: formatDateTime(match.startedAt) ?? '—' });
    }
    if (match.status === 'FINISHED') {
      fields.push({ label: 'Finished', value: formatDateTime(match.finishedAt) ?? '—' });
    }
    return fields;
  });
}
