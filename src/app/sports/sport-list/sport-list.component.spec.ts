import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ApiListResponse } from '../../common/models/api.model';
import { SearchService } from '../../common/services/search.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { SportImportProgress, SportImportRow } from '../models/sport-import.model';
import { CatalogueTotals, Sport, SportQuery } from '../models/sport.model';
import { SportImportService } from '../services/sport-import.service';
import { SportsApiService } from '../services/sports-api.service';
import { SportListPage } from './sport-list.component';

const sport = (id: string, name: string): Sport => ({
  id,
  name,
  description: null,
  iconUrl: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  governingBodyCount: 1,
  organizationCount: 2,
  teamCount: 3,
  participantCount: 4,
});

const page = (sports: Sport[], total: number, pageNumber = 1): ApiListResponse<Sport> => ({
  success: true,
  data: sports,
  meta: { page: pageNumber, limit: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) },
});

describe('SportListPage', () => {
  let fixture: ComponentFixture<SportListPage>;
  let element: HTMLElement;
  let api: {
    getSports$: ReturnType<typeof vi.fn<(query: SportQuery) => Observable<ApiListResponse<Sport>>>>;
    getCatalogueTotals$: ReturnType<typeof vi.fn>;
    createSport$: ReturnType<typeof vi.fn>;
    updateSport$: ReturnType<typeof vi.fn>;
    deleteSport$: ReturnType<typeof vi.fn>;
  };
  let sportImport: {
    import$: ReturnType<typeof vi.fn<(rows: readonly SportImportRow[]) => Observable<SportImportProgress>>>;
  };

  // `adjustApi` can swap fake responses before the page is created (for example, requests that never answer).
  async function setUp(canEdit = true, adjustApi?: () => void): Promise<void> {
    api = {
      getSports$: vi.fn(() => of(page([sport('a', 'Hockey'), sport('b', 'Boxing')], 12))),
      getCatalogueTotals$: vi.fn(() => of({ sports: 12, governingBodies: 27, organisations: 29, participants: 39 })),
      createSport$: vi.fn(() => of(sport('c', 'Padel'))),
      updateSport$: vi.fn(() => of(sport('a', 'Ice Hockey'))),
      deleteSport$: vi.fn(() => of(undefined)),
    };
    sportImport = {
      import$: vi.fn((rows: readonly SportImportRow[]) =>
        of(
          { total: rows.length, done: 0, added: 0, skipped: 0, failures: [] },
          { total: rows.length, done: rows.length, added: 1, skipped: rows.length - 1, failures: [] }
        )
      ),
    };
    adjustApi?.();
    await TestBed.configureTestingModule({
      imports: [SportListPage],
      providers: [
        provideRouter([]),
        { provide: SportsApiService, useValue: api },
        { provide: SportImportService, useValue: sportImport },
        { provide: AuthService, useValue: { hasAnyRole: () => canEdit } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SportListPage);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const lastQuery = (): SportQuery => api.getSports$.mock.lastCall![0];
  const click = (selector: string): void => (element.querySelector(selector) as HTMLElement).click();
  const buttonWithText = (text: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.trim() === text)!;

  it('shows the four totals from the backend and the first page of sports', async () => {
    await setUp();
    const cards = Array.from(element.querySelectorAll('app-stat-card')).map((card) =>
      card.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(cards).toEqual(['12 Sports', '27 Governing Bodies', '29 Organisations', '39 Participants']);
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
    expect(lastQuery()).toEqual({ search: '', page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
    expect(element.textContent).toContain('1–10 of 12');
  });

  it('shows skeletons for the totals and the table until the first data arrives', async () => {
    const totals$ = new Subject<CatalogueTotals>();
    const sports$ = new Subject<ApiListResponse<Sport>>();
    await setUp(true, () => {
      api.getCatalogueTotals$.mockReturnValue(totals$);
      api.getSports$.mockReturnValue(sports$);
    });
    await settle();

    expect(element.querySelectorAll('app-stat-card app-skeleton').length).toBe(4);
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(10);
    expect(element.querySelector('app-pagination')).toBeNull();

    totals$.next({ sports: 12, governingBodies: 27, organisations: 29, participants: 39 });
    sports$.next(page([sport('a', 'Hockey')], 12));
    await settle();
    expect(element.querySelectorAll('app-skeleton').length).toBe(0);
    expect(element.querySelectorAll('.sports-table__row').length).toBe(1);
  });

  it('searches on the server from the header search, back on page 1', async () => {
    await setUp();
    buttonWithText('Next').click();
    await settle();
    expect(lastQuery().page).toBe(2);

    TestBed.inject(SearchService).setQuery(' hock ');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await settle();
    expect(lastQuery()).toMatchObject({ search: 'hock', page: 1 });
  });

  it('sorts by name A–Z, then Z–A, then back to newest first', async () => {
    await setUp();
    for (const expected of [
      { sortBy: 'name', sortOrder: 'asc' },
      { sortBy: 'name', sortOrder: 'desc' },
      { sortBy: 'createdAt', sortOrder: 'desc' },
    ]) {
      click('.sports-table__sort');
      await settle();
      expect(lastQuery()).toMatchObject(expected);
    }
  });

  it('hides adding, editing and deleting from roles that cannot change sports', async () => {
    await setUp(false);
    expect(buttonWithText('Add Sport')).toBeUndefined();
    expect(buttonWithText('Import')).toBeUndefined();
    expect(element.querySelector('.sports-table__action')).toBeNull();
  });

  it('imports the rows of a chosen file, then reloads the list and the totals', async () => {
    await setUp();
    const sportsCalls = api.getSports$.mock.calls.length;
    buttonWithText('Import').click();
    await settle();
    const file = { name: 'sports.csv', text: () => Promise.resolve('name\nPadel\nSoccer\n') } as File;
    fixture.componentInstance.readImportFile(file);
    await settle();
    expect(element.textContent).toContain('2 rows ready to import.');

    const dialogButton = (text: string): HTMLButtonElement =>
      Array.from(element.querySelectorAll('app-sport-import-dialog button')).find(
        (button) => button.textContent?.trim() === text
      ) as HTMLButtonElement;
    dialogButton('Import').click();
    await settle();
    expect(sportImport.import$).toHaveBeenCalledWith([
      { row: 1, sport: { name: 'Padel' } },
      { row: 2, sport: { name: 'Soccer' } },
    ]);
    const totals = Array.from(element.querySelectorAll('.sport-import__totals app-stat-card')).map((card) =>
      card.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(totals).toEqual(['1 Added', '1 Skipped', '0 Failed']);
    expect(api.getSports$.mock.calls.length).toBeGreaterThan(sportsCalls);
    expect(api.getCatalogueTotals$).toHaveBeenCalledTimes(2);

    dialogButton('Close').click();
    await settle();
    expect(element.querySelector('app-sport-import-dialog .modal')).toBeNull();
  });

  it('adds a sport, then reloads the list and the totals', async () => {
    await setUp();
    buttonWithText('Add Sport').click();
    await settle();
    const name = element.querySelector('#sport-name') as HTMLInputElement;
    name.value = 'Padel';
    name.dispatchEvent(new Event('input'));
    await settle();
    click('app-sport-form-dialog button[type="submit"]');
    await settle();

    expect(api.createSport$).toHaveBeenCalledWith({ name: 'Padel' });
    expect(api.getCatalogueTotals$).toHaveBeenCalledTimes(2);
    expect(api.getSports$.mock.calls.length).toBeGreaterThan(1);
    expect(element.querySelector('.modal')).toBeNull();
  });

  it('explains a duplicate name and keeps the form open', async () => {
    await setUp();
    api.createSport$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    buttonWithText('Add Sport').click();
    await settle();
    const name = element.querySelector('#sport-name') as HTMLInputElement;
    name.value = 'Hockey';
    name.dispatchEvent(new Event('input'));
    await settle();
    click('app-sport-form-dialog button[type="submit"]');
    await settle();

    expect(element.querySelector('.modal [role="alert"]')?.textContent).toContain(
      'A sport called “Hockey” already exists'
    );
    expect(element.querySelector('.modal')).toBeTruthy();
  });

  it('edits a sport with the values from its row', async () => {
    await setUp();
    click('[aria-label="Edit Hockey"]');
    await settle();
    expect((element.querySelector('#sport-name') as HTMLInputElement).value).toBe('Hockey');
    click('app-sport-form-dialog button[type="submit"]');
    await settle();
    expect(api.updateSport$).toHaveBeenCalledWith('a', { name: 'Hockey', description: '' });
  });

  it('deletes a sport after confirmation, then reloads the list and totals', async () => {
    await setUp();
    click('[aria-label="Delete Boxing"]');
    await settle();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Delete Boxing?');
    buttonWithText('Delete').click();
    await settle();

    expect(api.deleteSport$).toHaveBeenCalledWith('b');
    expect(api.getCatalogueTotals$).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.dialog')).toBeNull();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    await setUp();
    api.getSports$.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    buttonWithText('Next').click();
    await settle();
    expect(element.querySelector('.sport-list__error')?.textContent).toContain("Couldn't load the sports");

    api.getSports$.mockReturnValue(of(page([sport('a', 'Hockey')], 12, 2)));
    buttonWithText('Try again').click();
    await settle();
    expect(element.querySelector('.sport-list__error')).toBeNull();
  });
});
