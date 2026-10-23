import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BreadcrumbsComponent } from './breadcrumbs.component';

describe('BreadcrumbsComponent', () => {
  it('links the earlier levels and marks the last one as the current page', async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    fixture.componentRef.setInput('items', [{ label: 'Sport', link: '/sports' }, { label: 'Football' }]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a.breadcrumbs__item')?.getAttribute('href')).toBe('/sports');
    const current = element.querySelector('[aria-current="page"]');
    expect(current?.textContent?.trim()).toBe('Football');
  });
});
