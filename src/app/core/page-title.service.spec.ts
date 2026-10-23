import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { PageTitleService } from './page-title.service';

@Component({ template: '' })
class BlankPage {}

describe('PageTitleService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sports', title: 'Sport Management', component: BlankPage },
          { path: 'untitled', component: BlankPage },
        ]),
        { provide: TitleStrategy, useExisting: PageTitleService },
      ],
    });
  });

  it('sets the browser title and shares the page title', async () => {
    await RouterTestingHarness.create('/sports');
    expect(document.title).toBe('Sport Management | Buzzer Admin Console');
    expect(await firstValueFrom(TestBed.inject(PageTitleService).pageTitle$)).toBe('Sport Management');
  });

  it('falls back to the app name for a route without a title', async () => {
    await RouterTestingHarness.create('/untitled');
    expect(document.title).toBe('Buzzer Admin Console');
  });
});
