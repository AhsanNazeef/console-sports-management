import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PageTitleService } from '../../../core/page-title.service';
import { NAV_GROUPS } from '../../constants/navigation.constants';
import { SearchService } from '../../services/search.service';
import { ViewportService } from '../../services/viewport.service';
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
  host: {
    '(document:keydown.escape)': 'closeDrawer()',
  },
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly searchService = inject(SearchService);
  private readonly viewport = inject(ViewportService);
  private readonly authService = inject(AuthService);

  readonly navGroups = NAV_GROUPS;
  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? null);
  readonly pageTitle = toSignal(this.pageTitleService.pageTitle$, { initialValue: '' });
  readonly searchQuery = toSignal(this.searchService.query$, { initialValue: '' });

  // Phones get the sidebar as a slide-in drawer; tablets start with the icon rail.
  readonly isPhone = toSignal(this.viewport.isPhone$, { requireSync: true });
  private readonly isTablet = toSignal(this.viewport.isTablet$, { requireSync: true });
  readonly sidebarCollapsed = linkedSignal(() => this.isTablet());
  readonly drawerOpen = signal(false);
  readonly showDrawer = computed(() => this.isPhone() && this.drawerOpen());

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

  onSidebarCollapsedChange(collapsed: boolean): void {
    if (this.isPhone()) {
      this.closeDrawer();
    } else {
      this.sidebarCollapsed.set(collapsed);
    }
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  onSearchQueryChange(query: string): void {
    this.searchService.setQuery(query);
  }

  onSignOut(): void {
    this.closeDrawer();
    this.authService.signOut();
  }
}
