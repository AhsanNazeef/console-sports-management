import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HeaderComponent] }).compileComponents();
    fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentRef.setInput('heading', 'Sport Management');
    fixture.detectChanges();
  });

  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  it('renders the page title', () => {
    expect(query('h1')?.textContent).toContain('Sport Management');
  });

  it('emits what is typed in the search field', () => {
    const emitted: string[] = [];
    fixture.componentInstance.searchQueryChange.subscribe((value) => emitted.push(value));
    const input = query('.header__search-input') as HTMLInputElement;
    input.value = 'foot';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toEqual(['foot']);
  });

  it('shows Cancel while there is a query, and Cancel clears it', () => {
    expect(query('.header__search-cancel')).toBeNull();
    const emitted: string[] = [];
    fixture.componentInstance.searchQueryChange.subscribe((value) => emitted.push(value));
    fixture.componentRef.setInput('searchQuery', 'foot');
    fixture.detectChanges();
    (query('.header__search-cancel') as HTMLButtonElement).click();
    expect(emitted).toEqual(['']);
  });

  it('can hide the search', () => {
    fixture.componentRef.setInput('showSearch', false);
    fixture.detectChanges();
    expect(query('.header__search')).toBeNull();
  });
});
