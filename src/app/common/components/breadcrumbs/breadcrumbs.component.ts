import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Breadcrumb {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  // The last item is the current page.
  readonly items = input.required<readonly Breadcrumb[]>();
  // Follow the links without changing the address bar (the sports drill-down keeps showing /sports).
  readonly skipLocationChange = input(false);
}
