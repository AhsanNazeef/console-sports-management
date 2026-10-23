import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityFormDialogComponent, EntityFormValue } from './entity-form-dialog.component';

describe('EntityFormDialogComponent', () => {
  let fixture: ComponentFixture<EntityFormDialogComponent>;
  let element: HTMLElement;
  let saved: EntityFormValue[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EntityFormDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(EntityFormDialogComponent);
    fixture.componentRef.setInput('heading', 'Add Governing Body');
    fixture.componentRef.setInput('detailLabel', 'Country');
    fixture.componentRef.setInput('open', true);
    saved = [];
    fixture.componentInstance.save.subscribe((value) => saved.push(value));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  const type = (selector: string, value: string): void => {
    const field = element.querySelector(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const submit = (): HTMLButtonElement => element.querySelector('button[type="submit"]') as HTMLButtonElement;

  it('shows the heading and the configured detail field', () => {
    expect(element.querySelector('.modal__title')?.textContent).toBe('Add Governing Body');
    expect(element.querySelector('label[for="entity-detail"]')?.textContent).toBe('Country');
    expect(submit().disabled).toBe(true);
  });

  it('saves the trimmed name and detail', () => {
    type('#entity-name', ' UEFA ');
    type('#entity-detail', ' Europe ');
    submit().click();
    expect(saved).toEqual([{ name: 'UEFA', detail: 'Europe' }]);
  });

  it('asks for a name once the field has been typed in and cleared', () => {
    type('#entity-name', 'x');
    type('#entity-name', '');
    expect(element.textContent).toContain('Enter a name.');
    expect(submit().disabled).toBe(true);
  });
});
