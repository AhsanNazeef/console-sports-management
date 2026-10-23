import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject } from 'rxjs';
import { ApiListResponse } from '../models/api.model';
import { SearchService } from '../services/search.service';
import { createPagedList, PagedQuery } from './paged-list.util';

interface Item {
  id: string;
}

const response = (ids: string[], total: number, page = 1): ApiListResponse<Item> => ({
  success: true,
  data: ids.map((id) => ({ id })),
  meta: { page, limit: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) },
});

describe('createPagedList', () => {
  const load = vi.fn<(query: PagedQuery, parentId: string) => Observable<ApiListResponse<Item>>>();
  const parentId = signal('');

  @Component({ template: '' })
  class HostComponent {
    readonly list = createPagedList<Item, PagedQuery>({
      initialQuery: { search: '', page: 1, limit: 10 },
      load,
      parentId,
    });
  }

  const settle = (ms = 0): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  beforeEach(() => {
    load.mockReset();
    load.mockReturnValue(of(response(['a', 'b'], 12)));
    parentId.set('');
  });

  function create(): HostComponent {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('waits for the parent id, then loads the first page', async () => {
    const host = create();
    await settle();
    expect(load).not.toHaveBeenCalled();
    expect(host.list.loading()).toBe(true);

    parentId.set('sport-1');
    TestBed.tick();
    await settle();
    expect(load).toHaveBeenLastCalledWith({ search: '', page: 1, limit: 10 }, 'sport-1');
    expect(host.list.rows().map((row) => row.id)).toEqual(['a', 'b']);
    expect(host.list.total()).toBe(12);
    expect(host.list.loading()).toBe(false);
  });

  it('follows the header search and goes back to page 1', async () => {
    parentId.set('sport-1');
    const host = create();
    host.list.goToPage(2);
    TestBed.tick();
    await settle();
    TestBed.inject(SearchService).setQuery(' uefa ');
    await settle(350);
    TestBed.tick();
    await settle();
    expect(load).toHaveBeenLastCalledWith({ search: 'uefa', page: 1, limit: 10 }, 'sport-1');
  });

  it('reloads on demand and reports failures without losing the last rows', async () => {
    parentId.set('sport-1');
    const host = create();
    TestBed.tick();
    await settle();
    const failing = new Subject<ApiListResponse<Item>>();
    load.mockReturnValue(failing);
    host.list.reload();
    failing.error(new Error('down'));
    await settle();
    expect(host.list.failed()).toBe(true);
    expect(host.list.rows().length).toBe(2);
  });

  it('steps back when the current page no longer exists', async () => {
    parentId.set('sport-1');
    const host = create();
    TestBed.tick();
    await settle();
    load.mockReturnValue(of(response([], 10, 2)));
    host.list.goToPage(2);
    TestBed.tick();
    await settle();
    TestBed.tick();
    await settle();
    expect(host.list.query().page).toBe(1);
  });
});
