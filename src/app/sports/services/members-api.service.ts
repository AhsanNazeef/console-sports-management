import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { ApiListResponse, ApiResponse } from '../../common/models/api.model';
import { USER_SEARCH_LIMIT } from '../constants/members.constants';
import {
  NewSquadMember,
  SquadMember,
  SquadMemberChanges,
  StaffGroup,
  StaffList,
  StaffMember,
  StaffMemberInput,
  UserSummary,
} from '../models/member.model';

// The squad and staff tabs and their popups show every error of these requests themselves.
const INLINE_ERRORS = new HttpContext().set(SKIP_HTTP_NOTICE, true);

// A club's squad and staff. Writes need an ADMIN or ORG token; removals answer 204 with no body.
@Injectable({ providedIn: 'root' })
export class MembersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getSquad$(organizationId: string): Observable<SquadMember[]> {
    return this.http
      .get<ApiResponse<SquadMember[]>>(`${this.baseUrl}/organizations/${organizationId}/squad`, {
        context: INLINE_ERRORS,
      })
      .pipe(map((response) => response.data));
  }

  addSquadMember$(organizationId: string, member: NewSquadMember): Observable<SquadMember> {
    return this.http
      .post<ApiResponse<SquadMember>>(`${this.baseUrl}/organizations/${organizationId}/squad`, member, {
        context: INLINE_ERRORS,
      })
      .pipe(map((response) => response.data));
  }

  updateSquadMember$(squadMemberId: string, changes: SquadMemberChanges): Observable<SquadMember> {
    return this.http
      .patch<ApiResponse<SquadMember>>(`${this.baseUrl}/squad/${squadMemberId}`, changes, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  removeSquadMember$(squadMemberId: string): Observable<void> {
    return this.http
      .delete(`${this.baseUrl}/squad/${squadMemberId}`, { context: INLINE_ERRORS })
      .pipe(map(() => undefined));
  }

  // The response holds a flat list and the same staff grouped by category; the groups keep a stable order.
  getStaffGroups$(organizationId: string): Observable<StaffGroup[]> {
    return this.http
      .get<ApiResponse<StaffList>>(`${this.baseUrl}/organizations/${organizationId}/staff`, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data.groups));
  }

  addStaffMember$(organizationId: string, input: StaffMemberInput): Observable<StaffMember> {
    return this.http
      .post<ApiResponse<StaffMember>>(`${this.baseUrl}/organizations/${organizationId}/staff`, withoutEmpty(input), {
        context: INLINE_ERRORS,
      })
      .pipe(map((response) => response.data));
  }

  updateStaffMember$(staffId: string, input: StaffMemberInput): Observable<StaffMember> {
    return this.http
      .patch<ApiResponse<StaffMember>>(`${this.baseUrl}/staff/${staffId}`, input, { context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }

  removeStaffMember$(staffId: string): Observable<void> {
    return this.http.delete(`${this.baseUrl}/staff/${staffId}`, { context: INLINE_ERRORS }).pipe(map(() => undefined));
  }

  // Users whose name or email matches, to pick a squad member from.
  searchUsers$(search: string): Observable<UserSummary[]> {
    const params = new HttpParams().set('search', search).set('limit', USER_SEARCH_LIMIT);
    return this.http
      .get<ApiListResponse<UserSummary>>(`${this.baseUrl}/users`, { params, context: INLINE_ERRORS })
      .pipe(map((response) => response.data));
  }
}

// A new staff member is sent without the optional fields left empty.
function withoutEmpty(input: StaffMemberInput): Partial<StaffMemberInput> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null));
}
