import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsComponent } from './tabs.component';

describe('TabsComponent', () => {
  let fixture: ComponentFixture<TabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TabsComponent] }).compileComponents();
    fixture = TestBed.createComponent(TabsComponent);
    fixture.componentRef.setInput('tabs', [
      { id: 'squad', label: 'Squad' },
      { id: 'staff', label: 'Staff' },
    ]);
    fixture.componentRef.setInput('activeId', 'squad');
    fixture.detectChanges();
  });

  const tabs = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));

  it('marks the active tab', () => {
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].classList).toContain('tabs__tab--active');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
  });

  it('emits the id of the clicked tab', () => {
    const changes: string[] = [];
    fixture.componentInstance.activeIdChange.subscribe((id) => changes.push(id));
    tabs()[1].click();
    expect(changes).toEqual(['staff']);
  });
});
