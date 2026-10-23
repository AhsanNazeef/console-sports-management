import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
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

  const params = (url: string): Record<string, string | null> => {
    const request = http.expectOne((req) => req.url === url);
    const keys = request.request.params.keys();
    const values = Object.fromEntries(keys.map((key) => [key, request.request.params.get(key)]));
    request.flush({ success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
    return values;
  };

  it('lists each level under its parent, with server-side search and paging', () => {
    api.getGoverningBodies$('s1', QUERY).subscribe();
    expect(params(`${BASE}/governing-bodies`)).toEqual({ sportId: 's1', page: '2', limit: '10', search: 'uefa' });

    api.getOrganisations$('g1', { ...QUERY, search: '' }).subscribe();
    expect(params(`${BASE}/organizations`)).toEqual({ governingBodyId: 'g1', page: '2', limit: '10' });

    api.getParticipants$('o1', QUERY).subscribe();
    expect(params(`${BASE}/players`)).toEqual({ organizationId: 'o1', page: '2', limit: '10', search: 'uefa' });
  });

  it('reads the counts from meta.total with ?limit=1', async () => {
    const counts = firstValueFrom(api.getSportCounts$('s1'));
    const totals: Record<string, number> = { 'governing-bodies': 3, organizations: 4, players: 5 };
    for (const [collection, total] of Object.entries(totals)) {
      const request = http.expectOne((req) => req.url === `${BASE}/${collection}`);
      expect(request.request.params.get('sportId')).toBe('s1');
      expect(request.request.params.get('limit')).toBe('1');
      request.flush({ success: true, data: [], meta: { page: 1, limit: 1, total, totalPages: total } });
    }
    expect(await counts).toEqual({ governingBodies: 3, organisations: 4, participants: 5 });
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
    team.flush({ success: true, data: { id: 't9' } });
    const player = http.expectOne(`${BASE}/players`);
    expect(player.request.body).toEqual({ firstName: 'Ana', lastName: 'Silva', teamId: 't9' });
    player.flush({ success: true, data: { id: 'p2' } });
    expect((await created).id).toBe('p2');
  });

  it('creates governing bodies and organisations under their parent', () => {
    api.createGoverningBody$({ name: 'UEFA', sportId: 's1', country: 'Europe' }).subscribe();
    expect(http.expectOne(`${BASE}/governing-bodies`).request.body).toEqual({
      name: 'UEFA',
      sportId: 's1',
      country: 'Europe',
    });
    api.createOrganisation$({ name: 'Premier League', governingBodyId: 'g1' }).subscribe();
    expect(http.expectOne(`${BASE}/organizations`).request.body).toEqual({
      name: 'Premier League',
      governingBodyId: 'g1',
    });
  });
});
