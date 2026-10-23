import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailField, DetailHeaderComponent, DetailHeaderLayout } from './detail-header.component';

@Component({
  imports: [DetailHeaderComponent],
  template: `
    <app-detail-header title="Football" seed="s1" [fields]="fields" [loading]="loading" [layout]="layout">
      <button detail-header-actions type="button">Edit</button>
    </app-detail-header>
  `,
})
class HostComponent {
  loading = false;
  layout: DetailHeaderLayout = 'inline';
  fields: DetailField[] = [
    { label: 'Created', value: 'Apr 13, 2025 at 23:15' },
    { label: 'Country', value: null },
  ];
}

describe('DetailHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the name, the projected actions and each fact, with a dash for missing ones', () => {
    expect(element.querySelector('h2')?.textContent).toBe('Football');
    expect(element.querySelector('.detail-header__actions button')?.textContent).toBe('Edit');
    const facts = Array.from(element.querySelectorAll('.detail-header__field')).map((field) =>
      field.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(facts).toEqual(['Created Apr 13, 2025 at 23:15', 'Country —']);
  });

  it('can show a large logo with the facts stacked under their labels', () => {
    expect(element.querySelector('.detail-header--stacked')).toBeNull();
    fixture.componentInstance.layout = 'stacked';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(element.querySelector('.detail-header--stacked')).toBeTruthy();
    expect((element.querySelector('app-entity-avatar') as HTMLElement).style.width).toBe('44px');
  });

  it('shows skeletons while loading', () => {
    fixture.componentInstance.loading = true;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(element.querySelector('h2')).toBeNull();
    expect(element.querySelectorAll('app-skeleton').length).toBe(4);
  });
});
