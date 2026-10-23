import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { APP_NAME } from '../common/constants/app.constants';

// Takes each route's `title` for the browser tab and shares it with the header.
@Injectable({ providedIn: 'root' })
export class PageTitleService extends TitleStrategy {
  private readonly browserTitle = inject(Title);
  private readonly pageTitle = new BehaviorSubject('');

  readonly pageTitle$: Observable<string> = this.pageTitle.asObservable();

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot) ?? '';
    this.pageTitle.next(pageTitle);
    this.browserTitle.setTitle(pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME);
  }
}
