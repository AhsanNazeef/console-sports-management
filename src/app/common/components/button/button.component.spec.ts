import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<ButtonComponent>;
  let button: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ButtonComponent] }).compileComponents();
    fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();
    button = fixture.nativeElement.querySelector('button');
  });

  it('emits clicked when pressed', () => {
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    button.click();
    expect(clicks).toBe(1);
  });

  it('does not emit clicked when disabled', () => {
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button.click();
    expect(button.disabled).toBe(true);
    expect(clicks).toBe(0);
  });

  it('applies the outline and small modifiers', () => {
    fixture.componentRef.setInput('variant', 'outline');
    fixture.componentRef.setInput('size', 'small');
    fixture.detectChanges();
    expect(button.classList).toContain('button--outline');
    expect(button.classList).toContain('button--small');
  });

  it('renders an icon from assets/icons when given', () => {
    fixture.componentRef.setInput('icon', 'ic_external_link');
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('assets/icons/ic_external_link.svg');
  });
});
