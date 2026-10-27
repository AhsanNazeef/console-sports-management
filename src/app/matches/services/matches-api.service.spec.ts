import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEFAULT_MATCH_QUERY } from '../constants/matches.constants';
import { MatchesApiService } from './matches-api.service';

const MATCHES = `${environment.apiBaseUrl}/matches`;
const ORGANIZATIONS = `${environment.apiBaseUrl}/organizations`;
const EMPTY_PAGE = { success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } };

describe('MatchesApiService', () => {
  let api: MatchesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(MatchesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists matches by status with server-side search, paging and sorting', () => {
    api
      .getMatches$({ ...DEFAULT_MATCH_QUERY, status: 'LIVE', search: 'arena', page: 2, sortBy: 'scheduledAt' })
      .subscribe();
    const request = http.expectOne((req) => req.url === MATCHES);
    expect(request.request.params.get('status')).toBe('LIVE');
    expect(request.request.params.get('search')).toBe('arena');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('sortBy')).toBe('scheduledAt');
    expect(request.request.params.get('sortOrder')).toBe('desc');
    request.flush(EMPTY_PAGE);
  });

  it('sends no status for the All tab and no empty search', () => {
    api.getMatches$(DEFAULT_MATCH_QUERY).subscribe();
    const request = http.expectOne((req) => req.url === MATCHES);
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('search')).toBe(false);
    request.flush(EMPTY_PAGE);
  });

  it('schedules, updates and deletes a match', async () => {
    const body = { sportId: 's1', homeTeamId: 't1', awayTeamId: 't2', scheduledAt: '2026-11-02T13:30:00.000Z' };
    const created = firstValueFrom(api.createMatch$(body));
    const post = http.expectOne(MATCHES);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(body);
    post.flush({ success: true, data: { id: 'm1' } });
    expect((await created).id).toBe('m1');

    api.updateMatch$('m1', { scheduledAt: '2026-11-02T14:00:00.000Z', venue: '' }).subscribe();
    const patch = http.expectOne(`${MATCHES}/m1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ scheduledAt: '2026-11-02T14:00:00.000Z', venue: '' });
    patch.flush({ success: true, data: { id: 'm1' } });

    api.deleteMatch$('m1').subscribe();
    const del = http.expectOne(`${MATCHES}/m1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ success: true, data: { id: 'm1', deleted: true } });
  });

  it('loads every sport and the teams of one sport, A–Z, for the Schedule Match popup', async () => {
    const sports = firstValueFrom(api.getSportOptions$());
    const sportsRequest = http.expectOne((req) => req.url === `${ORGANIZATIONS}/sports`);
    expect(sportsRequest.request.params.get('limit')).toBe('100');
    expect(sportsRequest.request.params.get('sortBy')).toBe('name');
    expect(sportsRequest.request.params.get('sortOrder')).toBe('asc');
    sportsRequest.flush({ ...EMPTY_PAGE, data: [{ id: 's1', name: 'Hockey', iconUrl: null }] });
    expect(await sports).toEqual([{ id: 's1', name: 'Hockey', iconUrl: null }]);

    const teams = firstValueFrom(api.getTeams$('s1'));
    const teamsRequest = http.expectOne((req) => req.url === `${ORGANIZATIONS}/teams`);
    expect(teamsRequest.request.params.get('sportId')).toBe('s1');
    expect(teamsRequest.request.params.get('sortBy')).toBe('name');
    teamsRequest.flush({ ...EMPTY_PAGE, data: [{ id: 't1', name: 'Away FC' }] });
    expect((await teams).map((team) => team.name)).toEqual(['Away FC']);
  });

  it('reads a match with its scoreboard, timeline and stats, and changes its status', async () => {
    api.getMatch$('m1').subscribe();
    http.expectOne(`${MATCHES}/m1`).flush({ success: true, data: { id: 'm1' } });

    const timeline = firstValueFrom(api.getTimeline$('m1'));
    http.expectOne(`${MATCHES}/m1/timeline`).flush({ success: true, data: [{ id: 'e1', minute: 12 }] });
    expect((await timeline).map((event) => event.minute)).toEqual([12]);

    api.getStats$('m1').subscribe();
    http.expectOne(`${MATCHES}/m1/stats`).flush({ success: true, data: { totalEvents: 0 } });
    api.getScoreboard$('m1').subscribe();
    http.expectOne(`${MATCHES}/m1/scoreboard`).flush({ success: true, data: { status: 'LIVE' } });

    api.changeStatus$('m1', 'LIVE').subscribe();
    const patch = http.expectOne(`${MATCHES}/m1/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'LIVE' });
    patch.flush({ success: true, data: { id: 'm1', status: 'LIVE' } });
  });

  it('adds an event to a match and lists a team’s players by last name', () => {
    api.addEvent$('m1', { type: 'GOAL', minute: 12, teamId: 't1' }).subscribe();
    const post = http.expectOne(`${MATCHES}/m1/events`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ type: 'GOAL', minute: 12, teamId: 't1' });
    post.flush({ success: true, data: { id: 'e1' } });

    api.getPlayers$('t1').subscribe();
    const players = http.expectOne((req) => req.url === `${ORGANIZATIONS}/players`);
    expect(players.request.params.get('teamId')).toBe('t1');
    expect(players.request.params.get('sortBy')).toBe('lastName');
    players.flush(EMPTY_PAGE);
  });
});
