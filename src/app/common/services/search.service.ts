import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Holds the header search text so the current page can filter by it.
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly query = new BehaviorSubject('');

  readonly query$: Observable<string> = this.query.asObservable();

  setQuery(query: string): void {
    this.query.next(query);
  }
}
