import { OverlayStackService } from '../services/overlay-stack.service';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

// Keeps Tab and Shift+Tab inside a popup: from the last control Tab goes back to the first, and the other way round.
// Focus that has slipped outside the popup is brought back in.
export function keepTabInside(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== 'Tab') {
    return;
  }
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.ownerDocument.activeElement;
  const inside = active instanceof Node && container.contains(active);
  if (event.shiftKey && (!inside || active === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault();
    first.focus();
  }
}

// Gives focus back to the control that opened a popup. If that control can't take it any more (removed, or disabled
// while saving), the popup still open underneath takes it, so focus never drops to the page behind.
export function restoreFocus(control: HTMLElement | null, overlays: OverlayStackService): void {
  if (!control) {
    return;
  }
  if (control.isConnected) {
    control.focus();
  }
  if (control.ownerDocument.activeElement !== control) {
    overlays.top()?.focusInside();
  }
}
