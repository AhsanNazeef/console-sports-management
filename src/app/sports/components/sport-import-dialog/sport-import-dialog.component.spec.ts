import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SportImportProgress } from '../../models/sport-import.model';
import { SportImportDialogComponent } from './sport-import-dialog.component';

describe('SportImportDialogComponent', () => {
  let fixture: ComponentFixture<SportImportDialogComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SportImportDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(SportImportDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const set = (inputs: Record<string, unknown>): void => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  };
  const button = (text: string): HTMLButtonElement =>
    Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
  const progress = (done: number, failures: SportImportProgress['failures'] = []): SportImportProgress => ({
    total: 3,
    done,
    added: 1,
    skipped: 1,
    failures,
  });

  it('passes on the chosen file and only allows importing once it has rows', () => {
    const chosen = vi.fn();
    fixture.componentInstance.fileChosen.subscribe(chosen);
    const input = element.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['name\nPadel'], 'sports.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    expect(chosen).toHaveBeenCalledWith(file);
    expect(button('Import').disabled).toBe(true);

    set({ rowCount: 3 });
    expect(element.textContent).toContain('3 rows ready to import.');
    expect(button('Import').disabled).toBe(false);

    set({ rowCount: null, fileError: "This file isn't valid JSON." });
    expect(element.querySelector('[role="alert"]')?.textContent).toContain("isn't valid JSON");
    expect(button('Import').disabled).toBe(true);
  });

  it('shows which row is being sent and blocks closing meanwhile', () => {
    set({ rowCount: 3, importing: true, progress: progress(1) });
    expect(element.querySelector('output')?.textContent).toBe('Importing 2 of 3…');
    expect(button('Cancel').disabled).toBe(true);
    expect(button('Importing…').disabled).toBe(true);
  });

  it('reports the added, skipped and failed totals with the reason for each failure', () => {
    set({ rowCount: 3, progress: progress(3, [{ row: 3, name: '', message: 'Required' }]) });
    const totals = Array.from(element.querySelectorAll('app-stat-card')).map((card) =>
      card.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(totals).toEqual(['1 Added', '1 Skipped', '1 Failed']);
    expect(element.querySelector('.sport-import__failures')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Row 3 “no name”: Required'
    );
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    button('Close').click();
    expect(closed).toHaveBeenCalled();
  });
});
