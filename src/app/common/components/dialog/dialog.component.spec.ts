import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';

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
});
