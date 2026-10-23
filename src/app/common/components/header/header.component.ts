import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly heading = input.required<string>();
  readonly showSearch = input(true);
  readonly searchQuery = input('');

  readonly searchQueryChange = output<string>();

  onSearchInput(event: Event): void {
    this.searchQueryChange.emit((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQueryChange.emit('');
  }
}
