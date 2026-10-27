import { Overlay, OverlayStackService } from '../services/overlay-stack.service';
import { keepTabInside, restoreFocus } from './focus.util';

describe('keepTabInside', () => {
  let outside: HTMLButtonElement;
  let popup: HTMLElement;
  let first: HTMLButtonElement;
  let last: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<button id="outside">Outside</button>' +
      '<section id="popup"><button id="first">First</button><button disabled>Off</button>' +
      '<button id="last">Last</button></section>';
    outside = document.getElementById('outside') as HTMLButtonElement;
    popup = document.getElementById('popup') as HTMLElement;
    first = document.getElementById('first') as HTMLButtonElement;
    last = document.getElementById('last') as HTMLButtonElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const tab = (shiftKey = false): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });
    keepTabInside(event, popup);
    return event;
  };

  it('goes from the last control back to the first', () => {
    last.focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('goes from the first control back to the last with Shift+Tab', () => {
    first.focus();
    tab(true);
    expect(document.activeElement).toBe(last);
  });

  it('brings focus back from outside the popup', () => {
    outside.focus();
    tab();
    expect(document.activeElement).toBe(first);
  });

  it('leaves Tab alone between controls inside the popup', () => {
    first.focus();
    expect(tab().defaultPrevented).toBe(false);
  });
});

describe('restoreFocus', () => {
  let overlays: OverlayStackService;
  let popup: Overlay;

  beforeEach(() => {
    overlays = new OverlayStackService();
    popup = { focusInside: vi.fn() };
    overlays.add(popup);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('gives focus back to the control', () => {
    const control = document.createElement('button');
    document.body.appendChild(control);
    restoreFocus(control, overlays);
    expect(document.activeElement).toBe(control);
    expect(popup.focusInside).not.toHaveBeenCalled();
  });

  it('lets the popup underneath take focus when the control is gone or disabled', () => {
    restoreFocus(document.createElement('button'), overlays);
    const disabled = document.createElement('button');
    disabled.disabled = true;
    document.body.appendChild(disabled);
    restoreFocus(disabled, overlays);
    expect(popup.focusInside).toHaveBeenCalledTimes(2);
  });
});
