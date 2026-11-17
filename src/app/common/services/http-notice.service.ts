import { Injectable, signal } from '@angular/core';
import { FORBIDDEN_MESSAGE, RATE_LIMITED_MESSAGE } from '../constants/http.constants';

// The console-wide message about a refused or rate-limited request, shown by the shell until dismissed or the
// next page opens.
@Injectable({ providedIn: 'root' })
export class HttpNoticeService {
  readonly notice = signal<string | null>(null);

  show(status: 403 | 429): void {
    this.notice.set(status === 403 ? FORBIDDEN_MESSAGE : RATE_LIMITED_MESSAGE);
  }

  dismiss(): void {
    this.notice.set(null);
  }
}
