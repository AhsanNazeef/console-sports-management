import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, startWith, switchMap } from 'rxjs';
import { EntityAvatarComponent } from '../../../common/components/entity-avatar/entity-avatar.component';
import { TextInputComponent } from '../../../common/components/text-input/text-input.component';
import { USER_SEARCH_DEBOUNCE_MS, USER_SEARCH_MIN_LENGTH } from '../../constants/members.constants';
import { UserSummary } from '../../models/member.model';
import { MembersApiService } from '../../services/members-api.service';
import { userName } from '../../utils/member-names.util';

type UserSearch =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'done'; term: string; users: UserSummary[] }
  | { status: 'failed' };

// Finds a user account by name or email, searching the server as the user types. Used to add a squad member.
@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [EntityAvatarComponent, FormsModule, TextInputComponent],
  templateUrl: './user-picker.component.html',
  styleUrl: './user-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPickerComponent {
  private readonly membersApi = inject(MembersApiService);

  readonly inputId = input('user-picker');
  readonly selected = model<UserSummary | null>(null);

  readonly term = signal('');
  readonly minLength = USER_SEARCH_MIN_LENGTH;
  readonly search = toSignal(
    toObservable(this.term).pipe(
      map((term) => term.trim()),
      debounceTime(USER_SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((term): Observable<UserSearch> => {
        if (term.length < USER_SEARCH_MIN_LENGTH) {
          return of({ status: 'idle' });
        }
        return this.membersApi.searchUsers$(term).pipe(
          map((users): UserSearch => ({ status: 'done', term, users })),
          catchError(() => of<UserSearch>({ status: 'failed' })),
          startWith<UserSearch>({ status: 'searching' })
        );
      })
    ),
    { initialValue: { status: 'idle' } as UserSearch }
  );

  readonly nameOf = userName;
}
