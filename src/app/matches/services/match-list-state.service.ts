import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { DEFAULT_MATCH_QUERY } from '../constants/matches.constants';
import { MatchQuery } from '../models/match.model';

// Remembers the Matches page's tab, page and order while a match is open, so going back shows the same rows.
// The address bar stays /matches (no ids or filters in it), so this lives here rather than in the URL.
// It belongs to one session: when the session ends (sign out or expiry), the next sign-in starts on All, page 1.
@Injectable({ providedIn: 'root' })
export class MatchListStateService {
  private readonly authService = inject(AuthService);

  readonly query = signal<MatchQuery>(DEFAULT_MATCH_QUERY);

  constructor() {
    effect(() => {
      if (!this.authService.currentUser()) {
        untracked(() => this.query.set(DEFAULT_MATCH_QUERY));
      }
    });
  }
}
