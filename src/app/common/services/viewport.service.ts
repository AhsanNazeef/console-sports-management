import { DOCUMENT, inject, Injectable } from '@angular/core';
import { distinctUntilChanged, fromEvent, map, Observable, of, startWith } from 'rxjs';
import { LAYOUT_BREAKPOINTS } from '../constants/layout.constants';

// Tells the shell which layout the current viewport needs.
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly view = inject(DOCUMENT).defaultView;

  readonly isPhone$ = this.matches$(`(max-width: ${LAYOUT_BREAKPOINTS.tablet - 0.02}px)`);
  readonly isTablet$ = this.matches$(
    `(min-width: ${LAYOUT_BREAKPOINTS.tablet}px) and (max-width: ${LAYOUT_BREAKPOINTS.desktop - 0.02}px)`
  );

  private matches$(query: string): Observable<boolean> {
    if (!this.view?.matchMedia) {
      return of(false);
    }
    const mediaQuery = this.view.matchMedia(query);
    return fromEvent<MediaQueryListEvent>(mediaQuery, 'change').pipe(
      map((event) => event.matches),
      startWith(mediaQuery.matches),
      distinctUntilChanged()
    );
  }
}
