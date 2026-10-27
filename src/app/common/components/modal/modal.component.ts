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

let nextId = 0;

// Popup for forms (Figma "Add Sport" / "Add Competition"): a title, a close button and projected content.
@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class ModalComponent implements Overlay {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly overlays = inject(OverlayStackService);
  private returnFocusTo: HTMLElement | null = null;

  readonly open = input(false);
  readonly heading = input.required<string>();

  readonly closed = output<void>();

  readonly titleId = `modal-title-${nextId++}`;

  constructor() {
    // Moves keyboard focus into the popup when it opens, and back to where it was when it closes.
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

  // The first field, or the close button.
  focusInside(): void {
    const firstField = this.host.nativeElement.querySelector<HTMLElement>('input, textarea, select');
    (firstField ?? this.host.nativeElement.querySelector<HTMLElement>('.modal__close'))?.focus();
  }

  onEscape(): void {
    if (this.open() && this.overlays.isTop(this)) this.closed.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    const popup = this.host.nativeElement.querySelector<HTMLElement>('.modal');
    if (this.open() && popup && this.overlays.isTop(this)) keepTabInside(event, popup);
  }
}
