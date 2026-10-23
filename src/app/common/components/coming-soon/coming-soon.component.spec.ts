import { TestBed } from '@angular/core/testing';
import { ComingSoonPage } from './coming-soon.component';

describe('ComingSoonPage', () => {
  it('says the section is coming soon', async () => {
    await TestBed.configureTestingModule({ imports: [ComingSoonPage] }).compileComponents();
    const fixture = TestBed.createComponent(ComingSoonPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('coming soon');
  });
});
