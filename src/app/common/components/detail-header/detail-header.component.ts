import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EntityAvatarComponent } from '../entity-avatar/entity-avatar.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

export interface DetailField {
  label: string;
  value: string | number | null;
}

// inline: small icon, labels beside their values (Figma "Football" card).
// stacked: large logo, a divider, labels above their values (Figma "UEFA" and "English Premier League" cards).
export type DetailHeaderLayout = 'inline' | 'stacked';

// Header card of a detail page (Figma "Sport" / "UEFA" cards): icon, name, actions and a grid of facts.
// Actions are projected with the `detail-header-actions` attribute.
@Component({
  selector: 'app-detail-header',
  standalone: true,
  imports: [EntityAvatarComponent, SkeletonComponent],
  templateUrl: './detail-header.component.html',
  styleUrl: './detail-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailHeaderComponent {
  readonly title = input('');
  readonly imageUrl = input<string | null>(null);
  readonly seed = input('');
  readonly fields = input<readonly DetailField[]>([]);
  readonly loading = input(false);
  readonly layout = input<DetailHeaderLayout>('inline');

  readonly avatarSize = computed(() => (this.layout() === 'stacked' ? 44 : 24));
}
