import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavGroup } from '../models/navigation.model';
import { SidebarComponent } from './sidebar.component';

@Component({ template: '' })
class BlankPage {}

const GROUPS: NavGroup[] = [
  { id: 'match', label: 'Match Management', items: [{ label: 'Sports', path: '/sports', icon: 'ic_sport' }] },
  { id: 'system', label: 'System', items: [{ label: 'Users', path: '/users', icon: 'ic_users' }] },
];

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentRef.setInput('groups', GROUPS);
    fixture.detectChanges();
  });

  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>);

  it('renders each group with links to its items', () => {
    expect(queryAll('.sidebar__group-toggle').map((el) => el.textContent?.trim())).toEqual([
      'Match Management',
      'System',
    ]);
    expect(queryAll('.sidebar__item').map((el) => el.getAttribute('href'))).toEqual(['/sports', '/users']);
  });

  it('folds and unfolds a group', () => {
    const toggle = queryAll('.sidebar__group-toggle')[0];
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(queryAll('.sidebar__items')[0].hidden).toBe(true);

    toggle.click();
    fixture.detectChanges();
    expect(queryAll('.sidebar__items')[0].hidden).toBe(false);
  });

  it('tells the parent when an item is chosen', async () => {
    let selected = 0;
    fixture.componentInstance.itemSelected.subscribe(() => selected++);
    queryAll('.sidebar__item')[1].click();
    await fixture.whenStable();
    expect(selected).toBe(1);
  });

  it('shows the signed-in user and asks to sign out', () => {
    expect(queryAll('.sidebar__user').length).toBe(0);
    let signOuts = 0;
    fixture.componentInstance.signOut.subscribe(() => signOuts++);
    fixture.componentRef.setInput('userEmail', 'admin@buzzer.dev');
    fixture.detectChanges();
    expect(queryAll('.sidebar__avatar')[0].textContent?.trim()).toBe('A');
    expect(queryAll('.sidebar__user-email')[0].textContent).toBe('admin@buzzer.dev');
    queryAll('.sidebar__sign-out')[0].click();
    expect(signOuts).toBe(1);
  });

  it('asks to collapse, and shows only icons when collapsed', () => {
    let collapsed: boolean | undefined;
    fixture.componentInstance.collapsedChange.subscribe((value) => (collapsed = value));
    queryAll('.sidebar__collapse')[0].click();
    expect(collapsed).toBe(true);

    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    expect(queryAll('.sidebar--collapsed').length).toBe(1);
    expect(queryAll('.sidebar__group-toggle').every((toggle) => toggle.hasAttribute('inert'))).toBe(true);
    expect(queryAll('.sidebar__item')[0].getAttribute('title')).toBe('Sports');
  });
});
