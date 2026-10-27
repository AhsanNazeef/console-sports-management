import { Injectable } from '@angular/core';

// A popup on the stack can take keyboard focus back, for when the control a newer popup returns to has gone.
export interface Overlay {
  focusInside(): void;
}

// The popups open right now, newest last. Only the newest one answers Escape and keeps Tab inside itself, so a
// confirmation opened over a popup closes on its own and the popup underneath stays put.
@Injectable({ providedIn: 'root' })
export class OverlayStackService {
  private readonly open: Overlay[] = [];

  add(overlay: Overlay): void {
    this.remove(overlay);
    this.open.push(overlay);
  }

  remove(overlay: Overlay): void {
    const index = this.open.indexOf(overlay);
    if (index !== -1) {
      this.open.splice(index, 1);
    }
  }

  // True for the newest popup, and for one that hasn't registered yet while nothing else is open.
  isTop(overlay: Overlay): boolean {
    return this.open.length === 0 || this.top() === overlay;
  }

  top(): Overlay | null {
    return this.open[this.open.length - 1] ?? null;
  }
}
