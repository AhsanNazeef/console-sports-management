import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

@Component({
  imports: [ModalComponent],
  template: `
    <app-modal heading="Add Sport" [open]="open" (closed)="closes = closes + 1">
      <p class="body">Form</p>
    </app-modal>
  `,
})
class HostComponent {
  open = false;
  closes = 0;
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  it('renders nothing while closed', () => {
    expect(query('.modal')).toBeNull();
  });

  it('shows the title and projected content when open', () => {
    fixture.componentInstance.open = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(query('.modal__title')?.textContent).toBe('Add Sport');
    expect(query('.body')?.textContent).toBe('Form');
  });

  it('moves focus into the popup when it opens', async () => {
    fixture.componentInstance.open = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(query('.modal__close'));
  });

  it('keeps Tab inside the popup', async () => {
    fixture.componentInstance.open = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    const close = query('.modal__close') as HTMLButtonElement;
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
  });

  it('asks to close from the × button, the backdrop and Escape', () => {
    fixture.componentInstance.open = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    (query('.modal__close') as HTMLButtonElement).click();
    (query('.modal-backdrop') as HTMLButtonElement).click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.closes).toBe(3);
  });
});
