import { TestBed } from '@angular/core/testing';
import { DesignSystemPage } from './design-system.component';

describe('DesignSystemPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesignSystemPage],
    }).compileComponents();
  });

  it('renders a section for each group of components', async () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    await fixture.whenStable();
    const headings = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h2'));
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Buttons',
      'Inputs',
      'Tags, tabs and segmented button',
      'Dialog',
    ]);
  });
});
