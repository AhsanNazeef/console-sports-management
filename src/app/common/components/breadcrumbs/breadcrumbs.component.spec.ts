import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BreadcrumbsComponent } from './breadcrumbs.component';

@Component({ template: '' })
class BlankPage {}

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

  it('can follow its links without changing the address bar', async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbsComponent],
      providers: [provideRouter([{ path: '**', component: BlankPage }]), provideLocationMocks()],
    }).compileComponents();
    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    fixture.componentRef.setInput('items', [{ label: 'Football', link: '/sports/s1' }, { label: 'UEFA' }]);
    fixture.componentRef.setInput('skipLocationChange', true);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('a')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/sports/s1');
    expect(TestBed.inject(Location).path()).toBe('');
  });
});
