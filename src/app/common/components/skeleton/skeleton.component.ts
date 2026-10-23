import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// A shimmering placeholder shaped like the content that is still loading. Hidden from screen readers.
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: '',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[class.skeleton--circle]': 'circle()',
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('12px');
  readonly circle = input(false);
}
