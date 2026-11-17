import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { DEFAULT_SPORT_QUERY } from '../constants/sports.constants';
import { SportsApiService } from './sports-api.service';

const BASE = `${environment.apiBaseUrl}/organizations`;

describe('SportsApiService', () => {
  let api: SportsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(SportsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists sports with server-side search, paging and sorting', () => {
    api.getSports$({ ...DEFAULT_SPORT_QUERY, search: 'ball', page: 2 }).subscribe();
    const request = http.expectOne((req) => req.url === `${BASE}/sports`);
    expect(request.request.params.get('search')).toBe('ball');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('sortBy')).toBe('createdAt');
    expect(request.request.params.get('sortOrder')).toBe('desc');
    expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    request.flush({ success: true, data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 1 } });
  });

  it('leaves out an empty search', () => {
    api.getSports$(DEFAULT_SPORT_QUERY).subscribe();
    const request = http.expectOne((req) => req.url === `${BASE}/sports`);
    expect(request.request.params.has('search')).toBe(false);
    request.flush({ success: true, data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  });

  it('reads a sport from its detail endpoint', async () => {
    const sport = firstValueFrom(api.getSport$('s1'));
    const request = http.expectOne(`${BASE}/sports/s1`);
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    request.flush({ success: true, data: { id: 's1', name: 'Padel' } });
    expect((await sport).name).toBe('Padel');
  });

  it('leaves a 403 or 429 on a sport read only for a breadcrumb to the console-wide notice', async () => {
    const sport = firstValueFrom(api.getSport$('s1', false));
    const request = http.expectOne(`${BASE}/sports/s1`);
    expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(false);
    request.flush({ success: true, data: { id: 's1', name: 'Padel' } });
    expect((await sport).name).toBe('Padel');
  });

  it('creates, updates and deletes a sport', async () => {
    const created = firstValueFrom(api.createSport$({ name: 'Padel' }));
    const post = http.expectOne(`${BASE}/sports`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ name: 'Padel' });
    expect(post.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    post.flush({ success: true, data: { id: 's1', name: 'Padel' } });
    expect((await created).id).toBe('s1');

    api.updateSport$('s1', { name: 'Padel Tennis' }).subscribe();
    const patch = http.expectOne(`${BASE}/sports/s1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    patch.flush({ success: true, data: { id: 's1', name: 'Padel Tennis' } });

    api.deleteSport$('s1').subscribe();
    const del = http.expectOne(`${BASE}/sports/s1`);
    expect(del.request.method).toBe('DELETE');
    expect(del.request.context.get(SKIP_HTTP_NOTICE)).toBe(true);
    del.flush({ success: true, data: { id: 's1', deleted: true } });
  });

  it('reads each stat total from meta.total with ?limit=1', async () => {
    const totals = firstValueFrom(api.getCatalogueTotals$());
    const counts: Record<string, number> = { sports: 13, 'governing-bodies': 27, organizations: 29, players: 39 };
    for (const [collection, total] of Object.entries(counts)) {
      const request = http.expectOne((req) => req.url === `${BASE}/${collection}`);
      expect(request.request.params.get('limit')).toBe('1');
      // The totals have no message of their own, so their 403 or 429 is left to the console-wide notice.
      expect(request.request.context.get(SKIP_HTTP_NOTICE)).toBe(false);
      request.flush({ success: true, data: [{}], meta: { page: 1, limit: 1, total, totalPages: total } });
    }
    expect(await totals).toEqual({ sports: 13, governingBodies: 27, organisations: 29, participants: 39 });
  });
});
