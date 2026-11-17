import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { HierarchyApiService } from './hierarchy-api.service';

const BASE = `${environment.apiBaseUrl}/organizations`;
const QUERY = { search: 'uefa', page: 2, limit: 10 };

describe('HierarchyApiService', () => {
  let api: HierarchyApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(HierarchyApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // The query of a list request, and whether the page shows its errors itself.
  const listRequest = (url: string): { params: Record<string, string | null>; inlineErrors: boolean } => {
    const request = http.expectOne((req) => req.url === url);
    const keys = request.request.params.keys();
    const params = Object.fromEntries(keys.map((key) => [key, request.request.params.get(key)]));
    const inlineErrors = request.request.context.get(SKIP_HTTP_NOTICE);
    request.flush({ success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
    return { params, inlineErrors };
  };

  it('lists each level under its parent, with server-side search and paging', () => {
    api.getGoverningBodies$('s1', QUERY).subscribe();
    expect(listRequest(`${BASE}/governing-bodies`)).toEqual({
      params: { sportId: 's1', page: '2', limit: '10', search: 'uefa' },
      inlineErrors: true,
    });

    api.getOrganisations$('g1', { ...QUERY, search: '' }).subscribe();
    expect(listRequest(`${BASE}/organizations`)).toEqual({
      params: { governingBodyId: 'g1', page: '2', limit: '10' },
      inlineErrors: true,
    });

    api.getParticipants$('o1', QUERY).subscribe();
    expect(listRequest(`${BASE}/players`)).toEqual({
      params: { organizationId: 'o1', page: '2', limit: '10', search: 'uefa' },
      inlineErrors: true,
    });
  });

  it('reads each record from its detail endpoint', async () => {
    const ids = Promise.all([
      firstValueFrom(api.getGoverningBody$('g1')).then((record) => record.id),
      firstValueFrom(api.getOrganisation$('o1')).then((record) => record.id),
      firstValueFrom(api.getParticipant$('p1')).then((record) => record.id),
    ]);
    for (const [collection, id] of [
      ['governing-bodies', 'g1'],
      ['organizations', 'o1'],
      ['players', 'p1'],
    ]) {
      const request = http.expectOne(`${BASE}/${collection}/${id}`);
      expect(request.request.method).toBe('GET');
      expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
      request.flush({ success: true, data: { id } });
    }
    expect(await ids).toEqual(['g1', 'o1', 'p1']);
  });

  it('leaves a 403 or 429 on an organisation read only for a breadcrumb to the console-wide notice', async () => {
    const organisation = firstValueFrom(api.getOrganisation$('o1', false));
    const request = http.expectOne(`${BASE}/organizations/o1`);
    expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(false);
    request.flush({ success: true, data: { id: 'o1' } });
    expect((await organisation).id).toBe('o1');
  });

  it('reads the counts from meta.total with ?limit=1', async () => {
    const counts = firstValueFrom(api.getSportCounts$('s1'));
    const totals: Record<string, number> = { 'governing-bodies': 3, organizations: 4, players: 5 };
    for (const [collection, total] of Object.entries(totals)) {
      const request = http.expectOne((req) => req.url === `${BASE}/${collection}`);
      expect(request.request.params.get('sportId')).toBe('s1');
      expect(request.request.params.get('limit')).toBe('1');
      // The counts have no message of their own, so their 403 or 429 is left to the console-wide notice.
      expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(false);
      request.flush({ success: true, data: [], meta: { page: 1, limit: 1, total, totalPages: total } });
    }
    expect(await counts).toEqual({ governingBodies: 3, organisations: 4, participants: 5 });
  });

  it('reads a governing body’s counts the same way', async () => {
    const counts = firstValueFrom(api.getGoverningBodyCounts$('g1'));
    const totals: Record<string, number> = { organizations: 4, players: 5 };
    for (const [collection, total] of Object.entries(totals)) {
      const request = http.expectOne((req) => req.url === `${BASE}/${collection}`);
      expect(request.request.params.get('governingBodyId')).toBe('g1');
      expect(request.request.params.get('limit')).toBe('1');
      expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(false);
      request.flush({ success: true, data: [], meta: { page: 1, limit: 1, total, totalPages: total } });
    }
    expect(await counts).toEqual({ organisations: 4, participants: 5 });
  });

  it('adds a participant to an existing team', async () => {
    const created = firstValueFrom(
      api.createParticipant$('o1', {
        participant: { firstName: 'Ana', lastName: 'Silva', position: 'Forward' },
        teamId: 't1',
        newTeamName: null,
      })
    );
    const request = http.expectOne(`${BASE}/players`);
    expect(request.request.body).toEqual({ firstName: 'Ana', lastName: 'Silva', position: 'Forward', teamId: 't1' });
    expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    request.flush({ success: true, data: { id: 'p1' } });
    expect((await created).id).toBe('p1');
  });

  it('creates the named team first when the organisation needs a new one', async () => {
    const created = firstValueFrom(
      api.createParticipant$('o1', {
        participant: { firstName: 'Ana', lastName: 'Silva' },
        teamId: null,
        newTeamName: 'First Team',
      })
    );
    const team = http.expectOne(`${BASE}/teams`);
    expect(team.request.body).toEqual({ name: 'First Team', organizationId: 'o1' });
    expect(team.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    team.flush({ success: true, data: { id: 't9' } });
    const player = http.expectOne(`${BASE}/players`);
    expect(player.request.body).toEqual({ firstName: 'Ana', lastName: 'Silva', teamId: 't9' });
    expect(player.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    player.flush({ success: true, data: { id: 'p2' } });
    expect((await created).id).toBe('p2');
  });

  it('creates governing bodies and organisations under their parent', () => {
    api.createGoverningBody$({ name: 'UEFA', sportId: 's1', country: 'Europe' }).subscribe();
    const governingBody = http.expectOne(`${BASE}/governing-bodies`).request;
    expect(governingBody.body).toEqual({
      name: 'UEFA',
      sportId: 's1',
      country: 'Europe',
    });
    expect(governingBody.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    api.createOrganisation$({ name: 'Premier League', governingBodyId: 'g1' }).subscribe();
    const organisation = http.expectOne(`${BASE}/organizations`).request;
    expect(organisation.body).toEqual({
      name: 'Premier League',
      governingBodyId: 'g1',
    });
    expect(organisation.context.get(SKIP_HTTP_NOTICE)).toBe(true);
  });
});
