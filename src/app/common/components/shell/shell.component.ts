import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, finalize, map } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { PageTitleService } from '../../../core/page-title.service';
import { RATE_LIMITED_MESSAGE } from '../../constants/http.constants';
import { NAV_GROUPS } from '../../constants/navigation.constants';
import { HttpNoticeService } from '../../services/http-notice.service';
import { SearchService } from '../../services/search.service';
import { ViewportService } from '../../services/viewport.service';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { focusMainIfRemoved } from '../../utils/focus.util';
import { ButtonComponent } from '../button/button.component';
import { HeaderComponent } from '../header/header.component';

// Layout for the signed-in console: sidebar, header, notices and the routed page.
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, ButtonComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeDrawer()',
  },
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly searchService = inject(SearchService);
  private readonly httpNotices = inject(HttpNoticeService);
  private readonly viewport = inject(ViewportService);
  private readonly authService = inject(AuthService);

  // The sidebar items whose page the account may open; a group left with none is hidden.
  readonly navGroups = computed(() =>
    NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.access || this.authService.can(item.access)),
    })).filter((group) => group.items.length > 0)
  );
  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? null);
  readonly pageTitle = toSignal(this.pageTitleService.pageTitle$, { initialValue: '' });
  readonly searchQuery = toSignal(this.searchService.query$, { initialValue: '' });
  readonly notice = this.httpNotices.notice.asReadonly();

  // Without its permissions the account sees no changes and no page that needs them, until they load.
  readonly accessErrorMessage = computed(() => {
    const error = this.authService.accessError();
    if (!error) return null;
    const retry = error.status === 429 ? RATE_LIMITED_MESSAGE : 'Please try again.';
    return `Couldn't load your account's permissions, so changes and some pages are hidden. ${retry}`;
  });
  readonly reloadingAccess = signal(false);

  // Phones get the sidebar as a slide-in drawer; tablets start with the icon rail.
  readonly isPhone = toSignal(this.viewport.isPhone$, { requireSync: true });
  private readonly isTablet = toSignal(this.viewport.isTablet$, { requireSync: true });
  readonly sidebarCollapsed = linkedSignal(() => this.isTablet());
  readonly drawerOpen = signal(false);
  readonly showDrawer = computed(() => this.isPhone() && this.drawerOpen());

  constructor() {
    const pageOpened$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      distinctUntilChanged((previous, current) => pathOf(previous) === pathOf(current)),
      takeUntilDestroyed()
    );
    // Each page starts with an empty search, unless its address brings one (Payments keeps its search in the query and
    // restores it). It is cleared once the next page has opened, so the page being left can't react to it; changes to
    // the query alone keep it.
    pageOpened$
      .pipe(filter((url) => !this.router.parseUrl(url).queryParamMap.has('search')))
      .subscribe(() => this.searchService.setQuery(''));
    // A notice belongs to the page it came from.
    pageOpened$.subscribe(() => this.httpNotices.dismiss());
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

  // Dismiss and Try again sit in rows that go away, so focus moves to the page when they do.
  dismissNotice(): void {
    const focused = this.document.activeElement;
    this.httpNotices.dismiss();
    focusMainIfRemoved(this.injector, focused);
  }

  reloadAccess(): void {
    const focused = this.document.activeElement;
    this.reloadingAccess.set(true);
    this.authService
      .reloadAccess$()
      .pipe(
        finalize(() => {
          this.reloadingAccess.set(false);
          focusMainIfRemoved(this.injector, focused);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onSignOut(): void {
    this.closeDrawer();
    this.authService.signOut();
  }
}

function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}
