import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableColumn, DataTableComponent } from './data-table.component';

interface Row {
  id: string;
  name: string;
  count: number;
}

@Component({
  imports: [DataTableComponent],
  template: `
    <app-data-table
      label="Governing bodies"
      [columns]="columns"
      [rows]="rows"
      [loading]="loading"
      [minWidth]="minWidth"
      emptyMessage="None yet."
    >
      <ng-template let-row let-key="key">
        @if (key === 'name') {
          <strong>{{ row.name }}</strong>
        } @else {
          {{ row.count }}
        }
      </ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  loading = false;
  minWidth: string | null = null;
  columns: DataTableColumn[] = [
    { key: 'name', label: 'Governing Body' },
    { key: 'count', label: 'Organisations', shaded: true },
  ];
  rows: Row[] = [
    { id: 'a', name: 'UEFA', count: 10 },
    { id: 'b', name: 'FIFA', count: 12 },
  ];
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const render = (change: (host: HostComponent) => void): void => {
    change(fixture.componentInstance);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  it('renders the headers and each cell through the projected template', () => {
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent)).toEqual([
      'Governing Body',
      'Organisations',
    ]);
    expect(element.querySelector('tbody tr td strong')?.textContent).toBe('UEFA');
    expect(element.querySelector('tbody tr td.data-table__cell--shaded')?.textContent?.trim()).toBe('10');
    expect(element.querySelector('caption')?.textContent).toBe('Governing bodies');
  });

  it('shows skeleton rows on the first load and the empty message once loaded', () => {
    render((host) => {
      host.rows = [];
      host.loading = true;
    });
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(10);
    expect(element.querySelector('output')?.textContent).toContain('Loading governing bodies…');

    render((host) => (host.loading = false));
    expect(element.querySelector('.data-table__empty')?.textContent).toBe('None yet.');
  });

  it('can be given a wider minimum, so narrow screens scroll it instead of squeezing the columns', () => {
    const table = element.querySelector('table') as HTMLTableElement;
    expect(table.style.minWidth).toBe('');
    render((host) => (host.minWidth = '640px'));
    expect(table.style.minWidth).toBe('640px');
  });

  it('keeps the rows, dimmed, during a later load', () => {
    render((host) => (host.loading = true));
    expect(element.querySelectorAll('.data-table__row').length).toBe(2);
    expect(element.querySelector('.data-table--loading')).toBeTruthy();
  });
});
