import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SESSION_CHECK_FAILED_MESSAGE, SESSION_EXPIRED_MESSAGE } from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';

// Lets signed-in users through, loading their profile from GET /auth/me once per page load.
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
      const expired = error instanceof HttpErrorResponse && error.status === 401;
      authService.endSession(expired ? SESSION_EXPIRED_MESSAGE : SESSION_CHECK_FAILED_MESSAGE);
      return of(authService.loginUrlTree(state.url));
    })
  );
};
