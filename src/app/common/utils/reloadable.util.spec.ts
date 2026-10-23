import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { createReloadable } from './reloadable.util';

describe('createReloadable', () => {
  const load = vi.fn<(key: string) => Observable<string>>();
  const key = signal('');

  @Component({ template: '' })
  class HostComponent {
    readonly item = createReloadable(load, key);
  }

  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

  function create(): HostComponent {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    load.mockReset();
    load.mockImplementation((id) => of(`value for ${id}`));
    key.set('');
  });

  it('waits for the key, then loads', async () => {
    const host = create();
    await settle();
    expect(load).not.toHaveBeenCalled();

    key.set('sport-1');
    TestBed.tick();
    await settle();
    expect(host.item.value()).toBe('value for sport-1');
    expect(host.item.loading()).toBe(false);
  });

  it('keeps the last value when a reload fails, and reports the status', async () => {
    key.set('sport-1');
    const host = create();
    TestBed.tick();
    await settle();
    load.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    host.item.reload();
    await settle();
    expect(host.item.value()).toBe('value for sport-1');
    expect(host.item.errorStatus()).toBe(503);
  });

  it('reports a missing record as 404', async () => {
    load.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    key.set('gone');
    const host = create();
    TestBed.tick();
    await settle();
    expect(host.item.value()).toBeNull();
    expect(host.item.errorStatus()).toBe(404);
  });
});
