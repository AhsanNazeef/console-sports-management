import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAvatarComponent } from './entity-avatar.component';

describe('EntityAvatarComponent', () => {
  let fixture: ComponentFixture<EntityAvatarComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EntityAvatarComponent] }).compileComponents();
    fixture = TestBed.createComponent(EntityAvatarComponent);
    fixture.componentRef.setInput('name', 'hockey');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the first letter on a palette colour when there is no icon', () => {
    expect(element.querySelector('.entity-avatar__badge')?.textContent?.trim()).toBe('H');
    expect(element.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the icon, and falls back to the letter if it fails to load', () => {
    fixture.componentRef.setInput('imageUrl', 'https://cdn.example.com/h.svg');
    fixture.detectChanges();
    const image = element.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('https://cdn.example.com/h.svg');

    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.entity-avatar__badge')).toBeTruthy();
  });

  it('can show a person’s photo in a rounded square', () => {
    expect(element.classList).not.toContain('entity-avatar--photo');
    fixture.componentRef.setInput('photo', true);
    fixture.componentRef.setInput('shape', 'rounded');
    fixture.detectChanges();
    expect(element.classList).toContain('entity-avatar--photo');
    expect(element.classList).toContain('entity-avatar--rounded');
  });

  it('takes the requested size', () => {
    fixture.componentRef.setInput('size', 44);
    fixture.detectChanges();
    expect(element.style.width).toBe('44px');
  });
});
