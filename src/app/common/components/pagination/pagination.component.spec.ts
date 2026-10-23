import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;

  async function render(page: number, total: number): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [PaginationComponent] }).compileComponents();
    fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const buttons = (element: HTMLElement): HTMLButtonElement[] =>
    Array.from(element.querySelectorAll('app-button button'));

  it('shows which rows are on screen and the page count', async () => {
    const element = await render(2, 23);
    expect(element.textContent).toContain('11–20 of 23');
    expect(element.textContent).toContain('Page 2 of 3');
  });

  it('asks for the previous and next pages', async () => {
    const element = await render(2, 23);
    const pages: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => pages.push(page));
    buttons(element)[0].click();
    buttons(element)[1].click();
    expect(pages).toEqual([1, 3]);
  });

  it('disables Previous on the first page and Next on the last', async () => {
    const element = await render(1, 7);
    expect(buttons(element).map((button) => button.disabled)).toEqual([true, true]);
    expect(element.textContent).toContain('1–7 of 7');
  });
});
