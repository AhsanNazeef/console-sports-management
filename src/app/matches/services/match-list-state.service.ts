import { Injectable, signal } from '@angular/core';
import { DEFAULT_MATCH_QUERY } from '../constants/matches.constants';
import { MatchQuery } from '../models/match.model';

// Remembers the Matches page's tab, page and order while a match is open, so going back shows the same rows.
// The address bar stays /matches (no ids or filters in it), so this lives here rather than in the URL.
@Injectable({ providedIn: 'root' })
export class MatchListStateService {
  readonly query = signal<MatchQuery>(DEFAULT_MATCH_QUERY);
}
