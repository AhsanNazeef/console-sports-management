import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { ApiListResponse, ApiResponse } from '../../common/models/api.model';
import { MATCH_OPTIONS_LIMIT, MatchStatusTarget } from '../constants/matches.constants';
import { MatchEvent, MatchPlayer, MatchScoreboard, MatchStats, NewMatchEvent } from '../models/match-event.model';
import { Match, MatchChanges, MatchQuery, MatchSport, MatchTeam, NewMatch } from '../models/match.model';

// For the requests whose errors the Matches pages and popups show themselves. The scoreboard and the players have no
// message of their own (the match record's score and the event form stand in), so the console-wide notice explains
// their 403 or 429.
const INLINE_ERRORS = new HttpContext().set(SKIP_HTTP_NOTICE, true);

@Injectable({ providedIn: 'root' })
export class MatchesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/matches`;
  private readonly organizationsUrl = `${environment.apiBaseUrl}/organizations`;

  // The backend matches ?search= against the venue.
  getMatches$(query: MatchQuery): Observable<ApiListResponse<Match>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit)
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder);
    if (query.status !== 'ALL') {
      params = params.set('status', query.status);
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    return this.http.get<ApiListResponse<Match>>(this.baseUrl, { params, context: INLINE_ERRORS });
  }

  createMatch$(input: NewMatch): Observable<Match> {
    return this.http
      .post<ApiResponse<Match>>(this.baseUrl, input, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  updateMatch$(id: string, changes: MatchChanges): Observable<Match> {
    return this.http
      .patch<ApiResponse<Match>>(`${this.baseUrl}/${id}`, changes, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  getMatch$(id: string): Observable<Match> {
    return this.http
      .get<ApiResponse<Match>>(`${this.baseUrl}/${id}`, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  // The backend refuses (400) any move its status rules don't allow.
  changeStatus$(id: string, status: MatchStatusTarget): Observable<Match> {
    return this.http
      .patch<ApiResponse<Match>>(`${this.baseUrl}/${id}/status`, { status }, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  // Events in match order.
  getTimeline$(id: string): Observable<MatchEvent[]> {
    return this.http
      .get<ApiResponse<MatchEvent[]>>(`${this.baseUrl}/${id}/timeline`, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  // Only a LIVE match takes events; the backend answers 400 otherwise.
  addEvent$(id: string, input: NewMatchEvent): Observable<MatchEvent> {
    return this.http
      .post<ApiResponse<MatchEvent>>(`${this.baseUrl}/${id}/events`, input, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  getStats$(id: string): Observable<MatchStats> {
    return this.http
      .get<ApiResponse<MatchStats>>(`${this.baseUrl}/${id}/stats`, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  getScoreboard$(id: string): Observable<MatchScoreboard> {
    return this.http
      .get<ApiResponse<MatchScoreboard>>(`${this.baseUrl}/${id}/scoreboard`)
      .pipe(map((response) => response.data));
  }

  // Soft delete: the match leaves every list.
  deleteMatch$(id: string): Observable<void> {
    return this.http.delete(`${this.baseUrl}/${id}`, { context: INLINE_ERRORS }).pipe(map(() => undefined));
  }

  // Every sport, A–Z, for the Schedule Match popup.
  getSportOptions$(): Observable<MatchSport[]> {
    const params = this.optionParams();
    return this.http
      .get<ApiListResponse<MatchSport>>(`${this.organizationsUrl}/sports`, { params, context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  // The teams of one sport (through their organisation and governing body), A–Z.
  getTeams$(sportId: string): Observable<MatchTeam[]> {
    const params = this.optionParams().set('sportId', sportId);
    return this.http
      .get<ApiListResponse<MatchTeam>>(`${this.organizationsUrl}/teams`, { params, context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  // A team's players, by last name, for the Add Event form and for naming the players in live events.
  getPlayers$(teamId: string): Observable<MatchPlayer[]> {
    const params = new HttpParams()
      .set('teamId', teamId)
      .set('limit', MATCH_OPTIONS_LIMIT)
      .set('sortBy', 'lastName')
      .set('sortOrder', 'asc');
    return this.http
      .get<ApiListResponse<MatchPlayer>>(`${this.organizationsUrl}/players`, { params })
      .pipe(map((response) => response.data));
  }

  private optionParams(): HttpParams {
    return new HttpParams().set('limit', MATCH_OPTIONS_LIMIT).set('sortBy', 'name').set('sortOrder', 'asc');
  }
}
