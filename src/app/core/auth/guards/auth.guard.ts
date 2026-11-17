import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SESSION_CHECK_FAILED_MESSAGE, SESSION_EXPIRED_MESSAGE } from '../../../auth/constants/auth.constants';
import { RATE_LIMITED_MESSAGE } from '../../../common/constants/http.constants';
import { AuthService } from '../services/auth.service';

// Lets signed-in users through, loading their profile from GET /auth/me (and their access) once per page load.
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  if (!authService.hasSession()) {
    return authService.loginUrlTree(state.url);
  }
  if (authService.currentUser()) {
    return true;
  }
  return authService.loadCurrentUser$().pipe(
    map(() => true),
    catchError((error: unknown) => {
      authService.endSession(sessionEndMessage(error));
      return of(authService.loginUrlTree(state.url));
    })
  );
};

// Why the login page is shown when the session couldn't be checked.
function sessionEndMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    return SESSION_EXPIRED_MESSAGE;
  }
  if (error instanceof HttpErrorResponse && error.status === 429) {
    return RATE_LIMITED_MESSAGE;
  }
  return SESSION_CHECK_FAILED_MESSAGE;
}
