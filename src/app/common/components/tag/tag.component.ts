import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-tag',
  standalone: true,
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagComponent {
  readonly selected = input(false);
  readonly icon = input<string | null>(null);

  readonly selectedChange = output<boolean>();

  toggle(): void {
    this.selectedChange.emit(!this.selected());
  }
}
