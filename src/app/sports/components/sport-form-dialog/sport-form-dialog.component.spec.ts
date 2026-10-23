import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Sport, SportInput } from '../../models/sport.model';
import { SportFormDialogComponent } from './sport-form-dialog.component';

const SPORT: Sport = {
  id: 's1',
  name: 'Hockey',
  description: 'On ice',
  iconUrl: 'https://cdn.example.com/hockey.svg',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  governingBodyCount: 1,
  organizationCount: 2,
  teamCount: 3,
  participantCount: 4,
};

describe('SportFormDialogComponent', () => {
  let fixture: ComponentFixture<SportFormDialogComponent>;
  let saved: SportInput[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SportFormDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(SportFormDialogComponent);
    saved = [];
    fixture.componentInstance.save.subscribe((input) => saved.push(input));
  });

  async function open(sport: Sport | null = null): Promise<HTMLElement> {
    fixture.componentRef.setInput('sport', sport);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    // ngModel writes the starting values a tick later, so render once more after it settles.
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function type(element: HTMLElement, selector: string, value: string): void {
    const field = element.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  const submit = (element: HTMLElement): void => {
    (element.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  };

  it('adds a sport with only the fields that were filled in', async () => {
    const element = await open();
    expect(element.querySelector('.modal__title')?.textContent).toBe('Add Sport');
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);

    type(element, '#sport-name', '  Padel ');
    submit(element);
    expect(saved).toEqual([{ name: 'Padel' }]);
  });

  it('sends every field when they are filled in', async () => {
    const element = await open();
    type(element, '#sport-name', 'Padel');
    type(element, '#sport-description', 'Racket sport');
    type(element, '#sport-icon', 'https://cdn.example.com/padel.svg');
    submit(element);
    expect(saved).toEqual([
      { name: 'Padel', description: 'Racket sport', iconUrl: 'https://cdn.example.com/padel.svg' },
    ]);
  });

  it('starts from the sport being edited and can clear its description', async () => {
    const element = await open(SPORT);
    expect(element.querySelector('.modal__title')?.textContent).toBe('Edit Sport');
    expect((element.querySelector('#sport-name') as HTMLInputElement).value).toBe('Hockey');

    type(element, '#sport-description', '');
    submit(element);
    expect(saved).toEqual([{ name: 'Hockey', description: '', iconUrl: 'https://cdn.example.com/hockey.svg' }]);
  });

  it('rejects a bad icon link and explains that an icon cannot be removed', async () => {
    let element = await open();
    type(element, '#sport-name', 'Padel');
    type(element, '#sport-icon', 'cdn.example.com/padel.svg');
    expect(element.textContent).toContain('Enter a full link starting with https://');
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    element = await open(SPORT);
    type(element, '#sport-icon', '');
    expect(element.textContent).toContain("The icon can't be removed");
  });

  it('shows the error from the page and the saving state', async () => {
    const element = await open();
    fixture.componentRef.setInput('error', 'A sport called "Padel" already exists.');
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('already exists');
    expect(element.querySelector('button[type="submit"]')?.textContent).toContain('Saving…');
  });
});
