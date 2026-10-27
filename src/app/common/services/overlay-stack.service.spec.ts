import { TestBed } from '@angular/core/testing';
import { Overlay, OverlayStackService } from './overlay-stack.service';

describe('OverlayStackService', () => {
  let overlays: OverlayStackService;
  const popup: Overlay = { focusInside: vi.fn() };
  const confirmation: Overlay = { focusInside: vi.fn() };

  beforeEach(() => {
    overlays = TestBed.inject(OverlayStackService);
  });

  it('treats the newest open popup as the top one', () => {
    overlays.add(popup);
    expect(overlays.isTop(popup)).toBe(true);
    overlays.add(confirmation);
    expect(overlays.isTop(confirmation)).toBe(true);
    expect(overlays.isTop(popup)).toBe(false);
    expect(overlays.top()).toBe(confirmation);
  });

  it('hands the top back when the newest one closes', () => {
    overlays.add(popup);
    overlays.add(confirmation);
    overlays.remove(confirmation);
    expect(overlays.isTop(popup)).toBe(true);
    expect(overlays.top()).toBe(popup);
  });

  it('lets a popup act while nothing else is open', () => {
    expect(overlays.isTop(popup)).toBe(true);
    expect(overlays.top()).toBeNull();
  });
});
