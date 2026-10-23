import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { PageTitleService } from '../../../core/page-title.service';
import { NAV_GROUPS } from '../../constants/navigation.constants';
import { SearchService } from '../../services/search.service';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

// Layout for the signed-in console: sidebar, header and the routed page.
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly searchService = inject(SearchService);

  readonly navGroups = NAV_GROUPS;
  readonly sidebarCollapsed = signal(false);
  readonly pageTitle = toSignal(this.pageTitleService.pageTitle$, { initialValue: '' });
  readonly searchQuery = toSignal(this.searchService.query$, { initialValue: '' });

  constructor() {
    // Each page starts with an empty search.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects.split('?')[0]),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe(() => this.searchService.setQuery(''));
  }

  onSearchQueryChange(query: string): void {
    this.searchService.setQuery(query);
  }
}
