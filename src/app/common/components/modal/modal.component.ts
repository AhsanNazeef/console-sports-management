import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

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
  },
})
export class ModalComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private returnFocusTo: HTMLElement | null = null;

  readonly open = input(false);
  readonly heading = input.required<string>();

  readonly closed = output<void>();

  readonly titleId = `modal-title-${nextId++}`;

  constructor() {
    // Moves keyboard focus into the popup when it opens, and back to where it was when it closes.
    afterRenderEffect(() => {
      if (this.open()) {
        this.returnFocusTo = this.document.activeElement as HTMLElement | null;
        const firstField = this.host.nativeElement.querySelector<HTMLElement>('input, textarea, select');
        (firstField ?? this.host.nativeElement.querySelector<HTMLElement>('.modal__close'))?.focus();
      } else if (this.returnFocusTo) {
        this.returnFocusTo.focus();
        this.returnFocusTo = null;
      }
    });
  }

  onEscape(): void {
    if (this.open()) this.closed.emit();
  }
}
