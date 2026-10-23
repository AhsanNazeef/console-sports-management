import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sport } from '../../models/sport.model';
import { SportsTableComponent } from './sports-table.component';

const sport = (id: string, name: string, iconUrl: string | null = null): Sport => ({
  id,
  name,
  description: null,
  iconUrl,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  governingBodyCount: 2,
  organizationCount: 5,
  teamCount: 7,
  participantCount: 40,
});

describe('SportsTableComponent', () => {
  let fixture: ComponentFixture<SportsTableComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SportsTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(SportsTableComponent);
    fixture.componentRef.setInput('sports', [
      sport('a', 'Hockey', 'https://cdn.example.com/h.svg'),
      sport('b', 'boxing'),
    ]);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const cells = (row: number): string[] =>
    Array.from(element.querySelectorAll(`tbody tr:nth-child(${row}) td`)).map((cell) => cell.textContent?.trim() ?? '');

  it('shows each sport with its icon or a lettered badge, and its counts', () => {
    expect(element.querySelectorAll('thead th').length).toBe(4);
    expect(cells(1)).toEqual(['Hockey', '2', '5', '40']);
    expect(element.querySelector('tbody tr:nth-child(1) img')?.getAttribute('src')).toBe(
      'https://cdn.example.com/h.svg'
    );
    expect(element.querySelector('tbody tr:nth-child(2) .sports-table__badge')?.textContent?.trim()).toBe('B');
  });

  it('falls back to the badge when an icon fails to load', () => {
    element.querySelector('tbody tr:nth-child(1) img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('tbody tr:nth-child(1) .sports-table__badge')?.textContent?.trim()).toBe('H');
  });

  it('offers edit and delete only to editors', () => {
    expect(element.querySelector('.sports-table__action')).toBeNull();
    fixture.componentRef.setInput('canEdit', true);
    fixture.detectChanges();
    const edits: Sport[] = [];
    const removes: Sport[] = [];
    fixture.componentInstance.edit.subscribe((value) => edits.push(value));
    fixture.componentInstance.remove.subscribe((value) => removes.push(value));
    (element.querySelector('[aria-label="Edit Hockey"]') as HTMLButtonElement).click();
    (element.querySelector('[aria-label="Delete boxing"]') as HTMLButtonElement).click();
    expect(edits.map((value) => value.id)).toEqual(['a']);
    expect(removes.map((value) => value.id)).toEqual(['b']);
  });

  it('asks to sort by name and shows the current order', () => {
    let requests = 0;
    fixture.componentInstance.sortByName.subscribe(() => requests++);
    (element.querySelector('.sports-table__sort') as HTMLButtonElement).click();
    expect(requests).toBe(1);

    fixture.componentRef.setInput('sortBy', 'name');
    fixture.componentRef.setInput('sortOrder', 'asc');
    fixture.detectChanges();
    expect(element.querySelector('th')?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('shows placeholder rows on the first load instead of an empty table', () => {
    fixture.componentRef.setInput('sports', []);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('skeletonRowCount', 10);
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(10);
    expect(element.querySelector('.sports-table__empty')).toBeNull();
    expect(element.querySelector('output')?.textContent).toContain('Loading sports…');
  });

  it('keeps the current rows (dimmed) while a later page loads', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr[aria-hidden="true"]').length).toBe(0);
    expect(element.querySelectorAll('.sports-table__row').length).toBe(2);
    expect(element.querySelector('.sports-table--loading')).toBeTruthy();
  });

  it('shows a message when there is nothing to list', () => {
    fixture.componentRef.setInput('sports', []);
    fixture.componentRef.setInput('emptyMessage', 'No sports match "zzz".');
    fixture.detectChanges();
    expect(element.querySelector('.sports-table__empty')?.textContent).toContain('No sports match "zzz".');
  });
});
