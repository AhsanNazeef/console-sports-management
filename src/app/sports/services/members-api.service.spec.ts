import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MembersApiService } from './members-api.service';

const API = environment.apiBaseUrl;

describe('MembersApiService', () => {
  let api: MembersApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(MembersApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads, adds, changes and removes squad members', async () => {
    const squad = firstValueFrom(api.getSquad$('o1'));
    http.expectOne(`${API}/organizations/o1/squad`).flush({ success: true, data: [{ id: 'm1' }] });
    expect(await squad).toEqual([{ id: 'm1' }]);

    api.addSquadMember$('o1', { userId: 'u1', position: 'Forward' }).subscribe();
    const add = http.expectOne(`${API}/organizations/o1/squad`);
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ userId: 'u1', position: 'Forward' });
    add.flush({ success: true, data: {} });

    api.updateSquadMember$('m1', { position: 'Defender', agreementEnd: null }).subscribe();
    const update = http.expectOne(`${API}/squad/m1`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ position: 'Defender', agreementEnd: null });
    update.flush({ success: true, data: {} });

    const removed = firstValueFrom(api.removeSquadMember$('m1'));
    const remove = http.expectOne(`${API}/squad/m1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    await expect(removed).resolves.toBeUndefined();
  });

  it('keeps the staff groups in the order the backend sends them', async () => {
    const groups = firstValueFrom(api.getStaffGroups$('o1'));
    http.expectOne(`${API}/organizations/o1/staff`).flush({
      success: true,
      data: {
        data: [],
        groups: [
          { category: 'club_president', members: [] },
          { category: 'executive_management', members: [] },
          { category: 'operations_administration', members: [] },
        ],
      },
    });
    expect((await groups).map((group) => group.category)).toEqual([
      'club_president',
      'executive_management',
      'operations_administration',
    ]);
  });

  it('leaves empty optional fields out of a new staff member but sends them as null when editing', () => {
    const input = {
      name: 'Ana',
      roleTitle: 'CEO',
      category: 'executive_management' as const,
      nationality: null,
      photoUrl: null,
    };
    api.addStaffMember$('o1', input).subscribe();
    expect(http.expectOne(`${API}/organizations/o1/staff`).request.body).toEqual({
      name: 'Ana',
      roleTitle: 'CEO',
      category: 'executive_management',
    });

    api.updateStaffMember$('s1', input).subscribe();
    const update = http.expectOne(`${API}/staff/s1`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(input);

    api.removeStaffMember$('s1').subscribe();
    expect(http.expectOne(`${API}/staff/s1`).request.method).toBe('DELETE');
  });

  it('searches users by name or email', () => {
    api.searchUsers$('ada').subscribe();
    const request = http.expectOne((req) => req.url === `${API}/users`);
    expect(request.request.params.get('search')).toBe('ada');
    expect(request.request.params.get('limit')).toBe('8');
  });
});
