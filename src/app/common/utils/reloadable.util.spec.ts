import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { FORBIDDEN_LOAD_MESSAGE, RATE_LIMITED_MESSAGE } from '../constants/http.constants';
import { createReloadable, firstLoadError } from './reloadable.util';

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

describe('firstLoadError', () => {
  const FALLBACK = "Couldn't load this sport.";
  const load = vi.fn<() => Observable<string>>();

  @Component({ template: '' })
  class HostComponent {
    readonly item = createReloadable(load);
  }

  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));
  const fail = (status: number): Observable<string> => throwError(() => new HttpErrorResponse({ status }));

  async function create(): Promise<HostComponent> {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await settle();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    load.mockReset();
    load.mockReturnValue(of('Football'));
  });

  it('has nothing to say while the first load runs', async () => {
    load.mockReturnValue(NEVER);
    const host = await create();
    expect(host.item.loading()).toBe(true);
    expect(firstLoadError(host.item, FALLBACK)).toBeNull();
  });

  it('says why the first load was refused or rate limited', async () => {
    load.mockReturnValue(fail(403));
    expect(firstLoadError((await create()).item, FALLBACK)).toBe(FORBIDDEN_LOAD_MESSAGE);

    load.mockReturnValue(fail(429));
    expect(firstLoadError((await create()).item, FALLBACK)).toBe(RATE_LIMITED_MESSAGE);
  });

  it('falls back for any other failure of the first load', async () => {
    load.mockReturnValue(fail(500));
    expect(firstLoadError((await create()).item, FALLBACK)).toBe(FALLBACK);
  });

  it('has nothing to say after a successful load', async () => {
    const host = await create();
    expect(host.item.value()).toBe('Football');
    expect(firstLoadError(host.item, FALLBACK)).toBeNull();
  });

  it('leaves a failed reload to the page while the last value still shows', async () => {
    const host = await create();
    load.mockReturnValue(fail(503));
    host.item.reload();
    await settle();
    expect(host.item.errorStatus()).toBe(503);
    expect(firstLoadError(host.item, FALLBACK)).toBeNull();
  });

  it('clears the message while a retry is loading', async () => {
    load.mockReturnValue(fail(500));
    const host = await create();
    expect(firstLoadError(host.item, FALLBACK)).toBe(FALLBACK);

    load.mockReturnValue(NEVER);
    host.item.reload();
    await settle();
    expect(host.item.errorStatus()).toBe(500);
    expect(firstLoadError(host.item, FALLBACK)).toBeNull();
  });
});

describe('createReloadable focus', () => {
  const load = vi.fn<(key: string) => Observable<string>>();

  // A page like the detail pages: the failure row (with Try again) only shows while the first load has failed.
  @Component({
    template: `<main tabindex="-1">
      <button type="button" id="elsewhere">Elsewhere</button>
      @if (error(); as message) {
        <p>{{ message }}</p>
        <button type="button" id="retry" (click)="item.reload()">Try again</button>
      }
    </main>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  class PageComponent {
    readonly item = createReloadable(load);
    readonly error = computed(() => firstLoadError(this.item, 'Could not load.'));
  }

  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

  async function open(): Promise<HTMLElement> {
    load.mockReset();
    load.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(PageComponent);
    fixture.autoDetectChanges();
    await settle();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('gives focus to the page when Try again removes its own row', async () => {
    const page = await open();
    load.mockReturnValueOnce(NEVER);
    const retry = page.querySelector<HTMLButtonElement>('#retry')!;
    retry.focus();
    expect(document.activeElement).toBe(retry);

    retry.click();
    await settle();
    expect(page.querySelector('#retry')).toBeNull();
    expect(document.activeElement).toBe(page.querySelector('main'));
  });

  it('leaves focus where it is when the clicked control stays', async () => {
    const page = await open();
    load.mockReturnValueOnce(NEVER);
    const elsewhere = page.querySelector<HTMLButtonElement>('#elsewhere')!;
    elsewhere.focus();

    page.querySelector<HTMLButtonElement>('#retry')!.click();
    await settle();
    expect(document.activeElement).toBe(elsewhere);
  });
});
