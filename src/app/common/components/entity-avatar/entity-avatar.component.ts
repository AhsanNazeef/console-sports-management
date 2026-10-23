import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { accentFor } from '../../utils/accent.util';

// An entity's icon on a white circle, or its first letter on a palette colour when there is no working icon.
// Decorative: the entity's name is always shown next to it.
@Component({
  selector: 'app-entity-avatar',
  standalone: true,
  templateUrl: './entity-avatar.component.html',
  styleUrl: './entity-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class EntityAvatarComponent {
  readonly name = input.required<string>();
  readonly imageUrl = input<string | null>(null);
  // Keeps the badge colour stable; usually the entity id.
  readonly seed = input('');
  readonly size = input(20);

  // Resets whenever a different image is given.
  readonly imageFailed = linkedSignal({ source: this.imageUrl, computation: () => false });
  readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase() || '?');
  readonly accent = computed(() => accentFor(this.seed() || this.name()));
}
