import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResponse } from '../../common/models/api.model';
import {
  ChildListQuery,
  GoverningBody,
  GoverningBodyCounts,
  GoverningBodyInput,
  NewParticipant,
  Organisation,
  OrganisationInput,
  Participant,
  SportCounts,
  Team,
} from '../models/hierarchy.model';

type Collection = 'governing-bodies' | 'organizations' | 'teams' | 'players';

// Governing bodies, organisations, teams and players under a sport.
// The filters sportId / governingBodyId / organizationId on these lists are honoured by the backend
// even where the OpenAPI spec doesn't list them (checked against the live API).
@Injectable({ providedIn: 'root' })
export class HierarchyApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/organizations`;

  getGoverningBodies$(sportId: string, query: ChildListQuery): Observable<ApiListResponse<GoverningBody>> {
    return this.list$('governing-bodies', { sportId }, query);
  }

  getGoverningBody$(id: string): Observable<GoverningBody> {
    return this.get$('governing-bodies', id);
  }

  createGoverningBody$(input: GoverningBodyInput): Observable<GoverningBody> {
    return this.create$('governing-bodies', input);
  }

  getOrganisations$(governingBodyId: string, query: ChildListQuery): Observable<ApiListResponse<Organisation>> {
    return this.list$('organizations', { governingBodyId }, query);
  }

  getOrganisation$(id: string): Observable<Organisation> {
    return this.get$('organizations', id);
  }

  createOrganisation$(input: OrganisationInput): Observable<Organisation> {
    return this.create$('organizations', input);
  }

  getParticipants$(organizationId: string, query: ChildListQuery): Observable<ApiListResponse<Participant>> {
    return this.list$('players', { organizationId }, query);
  }

  getParticipant$(id: string): Observable<Participant> {
    return this.get$('players', id);
  }

  // A player needs a team; when the popup names a new one, the team is created first.
  createParticipant$(organizationId: string, request: NewParticipant): Observable<Participant> {
    const teamId$ =
      request.newTeamName !== null
        ? this.create$<Team>('teams', { name: request.newTeamName, organizationId }).pipe(map((team) => team.id))
        : of(request.teamId ?? '');
    return teamId$.pipe(
      switchMap((teamId) => this.create$<Participant>('players', { ...request.participant, teamId }))
    );
  }

  // Each count is the collection's meta.total, fetched with ?limit=1.
  getSportCounts$(sportId: string): Observable<SportCounts> {
    return forkJoin({
      governingBodies: this.count$('governing-bodies', { sportId }),
      organisations: this.count$('organizations', { sportId }),
      participants: this.count$('players', { sportId }),
    });
  }

  getGoverningBodyCounts$(governingBodyId: string): Observable<GoverningBodyCounts> {
    return forkJoin({
      organisations: this.count$('organizations', { governingBodyId }),
      participants: this.count$('players', { governingBodyId }),
    });
  }

  private list$<T>(
    collection: Collection,
    filter: Record<string, string>,
    query: ChildListQuery
  ): Observable<ApiListResponse<T>> {
    let params = new HttpParams({ fromObject: filter }).set('page', query.page).set('limit', query.limit);
    if (query.search) {
      params = params.set('search', query.search);
    }
    return this.http.get<ApiListResponse<T>>(`${this.baseUrl}/${collection}`, { params });
  }

  private get$<T>(collection: Collection, id: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${collection}/${id}`).pipe(map((response) => response.data));
  }

  private create$<T>(collection: Collection, body: object): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${collection}`, body).pipe(map((response) => response.data));
  }

  private count$(collection: Collection, filter: Record<string, string>): Observable<number> {
    const params = new HttpParams({ fromObject: filter }).set('limit', 1);
    return this.http
      .get<ApiListResponse<unknown>>(`${this.baseUrl}/${collection}`, { params })
      .pipe(map((response) => response.meta.total));
  }
}
