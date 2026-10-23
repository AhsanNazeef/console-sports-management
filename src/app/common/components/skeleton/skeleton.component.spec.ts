import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  it('takes the given size, can be round, and is hidden from screen readers', async () => {
    await TestBed.configureTestingModule({ imports: [SkeletonComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('width', '48px');
    fixture.componentRef.setInput('height', '24px');
    fixture.componentRef.setInput('circle', true);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.style.width).toBe('48px');
    expect(host.style.height).toBe('24px');
    expect(host.classList).toContain('skeleton--circle');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });
});
