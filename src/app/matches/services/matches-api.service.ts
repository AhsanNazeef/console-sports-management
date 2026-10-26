import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResponse } from '../../common/models/api.model';
import { MATCH_OPTIONS_LIMIT, MatchStatusTarget } from '../constants/matches.constants';
import { MatchEvent, MatchScoreboard, MatchStats } from '../models/match-event.model';
import { Match, MatchChanges, MatchQuery, MatchSport, MatchTeam, NewMatch } from '../models/match.model';

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
    return this.http.get<ApiListResponse<Match>>(this.baseUrl, { params });
  }

  createMatch$(input: NewMatch): Observable<Match> {
    return this.http.post<ApiResponse<Match>>(this.baseUrl, input).pipe(map((response) => response.data));
  }

  updateMatch$(id: string, changes: MatchChanges): Observable<Match> {
    return this.http.patch<ApiResponse<Match>>(`${this.baseUrl}/${id}`, changes).pipe(map((response) => response.data));
  }

  getMatch$(id: string): Observable<Match> {
    return this.http.get<ApiResponse<Match>>(`${this.baseUrl}/${id}`).pipe(map((response) => response.data));
  }

  // The backend refuses (400) any move its status rules don't allow.
  changeStatus$(id: string, status: MatchStatusTarget): Observable<Match> {
    return this.http
      .patch<ApiResponse<Match>>(`${this.baseUrl}/${id}/status`, { status })
      .pipe(map((response) => response.data));
  }

  // Events in match order.
  getTimeline$(id: string): Observable<MatchEvent[]> {
    return this.http
      .get<ApiResponse<MatchEvent[]>>(`${this.baseUrl}/${id}/timeline`)
      .pipe(map((response) => response.data));
  }

  getStats$(id: string): Observable<MatchStats> {
    return this.http.get<ApiResponse<MatchStats>>(`${this.baseUrl}/${id}/stats`).pipe(map((response) => response.data));
  }

  getScoreboard$(id: string): Observable<MatchScoreboard> {
    return this.http
      .get<ApiResponse<MatchScoreboard>>(`${this.baseUrl}/${id}/scoreboard`)
      .pipe(map((response) => response.data));
  }

  // Soft delete: the match leaves every list.
  deleteMatch$(id: string): Observable<void> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(map(() => undefined));
  }

  // Every sport, A–Z, for the Schedule Match popup.
  getSportOptions$(): Observable<MatchSport[]> {
    const params = this.optionParams();
    return this.http
      .get<ApiListResponse<MatchSport>>(`${this.organizationsUrl}/sports`, { params })
      .pipe(map((response) => response.data));
  }

  // The teams of one sport (through their organisation and governing body), A–Z.
  getTeams$(sportId: string): Observable<MatchTeam[]> {
    const params = this.optionParams().set('sportId', sportId);
    return this.http
      .get<ApiListResponse<MatchTeam>>(`${this.organizationsUrl}/teams`, { params })
      .pipe(map((response) => response.data));
  }

  private optionParams(): HttpParams {
    return new HttpParams().set('limit', MATCH_OPTIONS_LIMIT).set('sortBy', 'name').set('sortOrder', 'asc');
  }
}
