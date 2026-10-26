import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusTagComponent, StatusTone } from './status-tag.component';

@Component({
  imports: [StatusTagComponent],
  template: `<app-status-tag [tone]="tone()" [pulse]="pulse()">Live</app-status-tag>`,
})
class HostComponent {
  readonly tone = signal<StatusTone>('red');
  readonly pulse = signal(false);
}

describe('StatusTagComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  const tag = (): HTMLElement => fixture.nativeElement.querySelector('.status-tag');

  it('shows the label in the tone colour', () => {
    expect(tag().textContent?.trim()).toBe('Live');
    expect(tag().classList).toContain('status-tag');
    expect(tag().classList).toContain('status-tag--red');

    fixture.componentInstance.tone.set('green');
    fixture.detectChanges();
    expect(tag().classList).toContain('status-tag--green');
    expect(tag().classList).not.toContain('status-tag--red');
  });

  it('shows a dot only when pulsing', () => {
    expect(tag().querySelector('.status-tag__dot')).toBeNull();

    fixture.componentInstance.pulse.set(true);
    fixture.detectChanges();
    expect(tag().querySelector('.status-tag__dot')).not.toBeNull();
  });
});
