import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from '../modal/modal.component';
import { DialogComponent } from './dialog.component';

// A confirmation opened over a popup, as on the Payments page.
@Component({
  imports: [DialogComponent, ModalComponent],
  template: `
    <button type="button" class="opener">Open</button>
    <app-modal heading="TXN-1" [open]="popupOpen" (closed)="popupCloses = popupCloses + 1">
      @if (showAsk) {
        <button type="button" class="ask">Change Status</button>
      }
    </app-modal>
    <app-dialog
      heading="Change TXN-1?"
      primaryLabel="Change Status"
      secondaryLabel="Go back"
      [open]="confirmOpen"
      (closed)="confirmCloses = confirmCloses + 1"
    />
  `,
})
class StackHostComponent {
  showAsk = true;
  popupOpen = false;
  confirmOpen = false;
  popupCloses = 0;
  confirmCloses = 0;
}

describe('DialogComponent', () => {
  let fixture: ComponentFixture<DialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(DialogComponent);
    fixture.componentRef.setInput('heading', 'Delete sport?');
    fixture.detectChanges();
  });

  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  it('renders nothing while closed', () => {
    expect(query('.dialog')).toBeNull();
  });

  it('renders the title and one action when open', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(query('.dialog__title')?.textContent).toContain('Delete sport?');
    expect(fixture.nativeElement.querySelectorAll('app-button').length).toBe(1);
  });

  it('emits primary and secondary from the two buttons', () => {
    let primary = 0;
    let secondary = 0;
    fixture.componentInstance.primary.subscribe(() => primary++);
    fixture.componentInstance.secondary.subscribe(() => secondary++);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('secondaryLabel', 'Cancel');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('app-button button') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();
    expect(primary).toBe(1);
    expect(secondary).toBe(1);
  });

  it('emits closed from the backdrop and the Escape key', () => {
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    (query('.dialog-backdrop') as HTMLButtonElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(2);
  });

  it('moves focus to the way back when it opens and returns it when it closes', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    fixture.componentRef.setInput('secondaryLabel', 'Go back');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = fixture.nativeElement.querySelectorAll('.dialog__actions button') as NodeListOf<HTMLButtonElement>;
    expect(document.activeElement).toBe(buttons[1]);

    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('DialogComponent over a popup', () => {
  let fixture: ComponentFixture<StackHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StackHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(StackHostComponent);
    fixture.detectChanges();
  });

  async function open(changes: Partial<StackHostComponent>): Promise<void> {
    Object.assign(fixture.componentInstance, changes);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('answers Escape on its own and leaves the popup open', async () => {
    await open({ popupOpen: true });
    await open({ confirmOpen: true });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.confirmCloses).toBe(1);
    expect(fixture.componentInstance.popupCloses).toBe(0);
  });

  it('returns focus to the popup button that opened it', async () => {
    await open({ popupOpen: true });
    const ask = fixture.nativeElement.querySelector('.ask') as HTMLButtonElement;
    ask.focus();
    await open({ confirmOpen: true });
    expect(fixture.nativeElement.querySelector('.dialog')?.contains(document.activeElement)).toBe(true);
    await open({ confirmOpen: false });
    expect(document.activeElement).toBe(ask);
  });

  it('gives focus to the popup when the button that opened it has gone', async () => {
    await open({ popupOpen: true });
    (fixture.nativeElement.querySelector('.ask') as HTMLButtonElement).focus();
    await open({ confirmOpen: true });
    await open({ showAsk: false });
    await open({ confirmOpen: false });
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.modal__close'));
  });
});
