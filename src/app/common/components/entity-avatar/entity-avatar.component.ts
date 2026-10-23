import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { accentFor } from '../../utils/accent.util';

// An entity's icon on a white circle, or its first letter on a palette colour when there is no working icon.
// A person's photo fills the shape instead. Decorative: the name is always shown next to it.
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
    '[class.entity-avatar--photo]': 'photo()',
    '[class.entity-avatar--rounded]': "shape() === 'rounded'",
  },
})
export class EntityAvatarComponent {
  readonly name = input.required<string>();
  readonly imageUrl = input<string | null>(null);
  // Keeps the badge colour stable; usually the entity id.
  readonly seed = input('');
  readonly size = input(20);
  // A photo (a person) rather than an icon (a sport or club).
  readonly photo = input(false);
  // Figma's staff cards use rounded squares; everything else is a circle.
  readonly shape = input<'circle' | 'rounded'>('circle');

  // Resets whenever a different image is given.
  readonly imageFailed = linkedSignal({ source: this.imageUrl, computation: () => false });
  readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase() || '?');
  readonly accent = computed(() => accentFor(this.seed() || this.name()));
}
