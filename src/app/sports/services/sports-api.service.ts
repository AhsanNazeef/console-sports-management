import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { ApiListResponse, ApiResponse } from '../../common/models/api.model';
import { CatalogueTotals, Sport, SportInput, SportQuery } from '../models/sport.model';

// For the requests whose errors the pages, popups and the import show themselves. The totals, and a sport loaded only
// for a breadcrumb, have no message of their own, so the console-wide notice explains their 403 or 429.
const INLINE_ERRORS = new HttpContext().set(SKIP_HTTP_NOTICE, true);

@Injectable({ providedIn: 'root' })
export class SportsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/organizations`;

  getSports$(query: SportQuery): Observable<ApiListResponse<Sport>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit)
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder);
    if (query.search) {
      params = params.set('search', query.search);
    }
    return this.http.get<ApiListResponse<Sport>>(`${this.baseUrl}/sports`, { params, context: INLINE_ERRORS });
  }

  // The detail endpoint has no counts; the detail page loads them separately. A page that shows the sport's name only in
  // its breadcrumb passes `inlineErrors = false`, so a refusal still gets the console-wide notice.
  getSport$(id: string, inlineErrors = true): Observable<Sport> {
    return this.http
      .get<ApiResponse<Sport>>(`${this.baseUrl}/sports/${id}`, inlineErrors ? { context: INLINE_ERRORS } : {})
      .pipe(map((response) => response.data));
  }

  createSport$(input: SportInput): Observable<Sport> {
    return this.http
      .post<ApiResponse<Sport>>(`${this.baseUrl}/sports`, input, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  updateSport$(id: string, input: SportInput): Observable<Sport> {
    return this.http
      .patch<ApiResponse<Sport>>(`${this.baseUrl}/sports/${id}`, input, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  // Soft delete: the sport leaves every list, but the backend keeps its name reserved.
  deleteSport$(id: string): Observable<void> {
    return this.http.delete(`${this.baseUrl}/sports/${id}`, { context: INLINE_ERRORS }).pipe(map(() => undefined));
  }

  // Each total is that collection's meta.total, fetched with ?limit=1 rather than counted here.
  // There is no participants endpoint; participants are the players under each sport's teams.
  getCatalogueTotals$(): Observable<CatalogueTotals> {
    return forkJoin({
      sports: this.countOf$('sports'),
      governingBodies: this.countOf$('governing-bodies'),
      organisations: this.countOf$('organizations'),
      participants: this.countOf$('players'),
    });
  }

  private countOf$(collection: string): Observable<number> {
    const params = new HttpParams().set('limit', 1);
    return this.http
      .get<ApiListResponse<unknown>>(`${this.baseUrl}/${collection}`, { params })
      .pipe(map((response) => response.meta.total));
  }
}
