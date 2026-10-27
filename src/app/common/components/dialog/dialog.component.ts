import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Overlay, OverlayStackService } from '../../services/overlay-stack.service';
import { keepTabInside, restoreFocus } from '../../utils/focus.util';
import { ButtonComponent } from '../button/button.component';

let nextId = 0;

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class DialogComponent implements Overlay {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly overlays = inject(OverlayStackService);
  private returnFocusTo: HTMLElement | null = null;

  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly description = input<string | null>(null);
  readonly icon = input<string | null>('ic_verified_badge');
  readonly primaryLabel = input('OK');
  readonly primaryDisabled = input(false);
  readonly secondaryLabel = input<string | null>(null);

  readonly primary = output<void>();
  readonly secondary = output<void>();
  readonly closed = output<void>();

  readonly titleId = `dialog-title-${nextId++}`;

  constructor() {
    // Moves keyboard focus into the dialog when it opens (to the way back, when there is one, so Enter can't confirm
    // by accident), and back to where it was when it closes.
    afterRenderEffect(() => {
      if (this.open()) {
        this.overlays.add(this);
        this.returnFocusTo = this.document.activeElement as HTMLElement | null;
        this.focusInside();
      } else {
        this.overlays.remove(this);
        restoreFocus(this.returnFocusTo, this.overlays);
        this.returnFocusTo = null;
      }
    });
    inject(DestroyRef).onDestroy(() => this.overlays.remove(this));
  }

  // The way back when there is one, otherwise the main action.
  focusInside(): void {
    const actions = this.host.nativeElement.querySelectorAll<HTMLElement>('.dialog__actions button');
    actions[actions.length - 1]?.focus();
  }

  onEscape(): void {
    if (this.open() && this.overlays.isTop(this)) this.closed.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    const dialog = this.host.nativeElement.querySelector<HTMLElement>('.dialog');
    if (this.open() && dialog && this.overlays.isTop(this)) keepTabInside(event, dialog);
  }
}
