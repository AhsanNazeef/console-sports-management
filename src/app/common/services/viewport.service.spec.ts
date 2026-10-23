import { TestBed } from '@angular/core/testing';
import { ViewportService } from './viewport.service';

// A MediaQueryList stand-in whose `matches` can be flipped by dispatching a change event.
function fakeMediaQuery(matches: boolean): MediaQueryList {
  return Object.assign(new EventTarget(), { matches }) as unknown as MediaQueryList;
}

// The test DOM has no matchMedia, so the window the service reads gets one for each test.
function stubMatchMedia(matchMedia: (query: string) => MediaQueryList): void {
  Object.defineProperty(document.defaultView, 'matchMedia', { configurable: true, value: matchMedia });
}

describe('ViewportService', () => {
  afterEach(() => {
    delete (document.defaultView as Partial<Window>).matchMedia;
  });

  it('reports the current match and later changes', () => {
    const phoneQuery = fakeMediaQuery(true);
    stubMatchMedia((query) => (query.startsWith('(max-width') ? phoneQuery : fakeMediaQuery(false)));
    const values: boolean[] = [];
    TestBed.inject(ViewportService).isPhone$.subscribe((value) => values.push(value));

    phoneQuery.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
    expect(values).toEqual([true, false]);
  });

  it('asks for the phone and tablet widths', () => {
    const matchMedia = vi.fn(() => fakeMediaQuery(false));
    stubMatchMedia(matchMedia);
    TestBed.inject(ViewportService);
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 767.98px)');
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1023.98px)');
  });

  it('falls back to the desktop layout when matchMedia is missing', () => {
    const values: boolean[] = [];
    TestBed.inject(ViewportService).isPhone$.subscribe((value) => values.push(value));
    expect(values).toEqual([false]);
  });
});
