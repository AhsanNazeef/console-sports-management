import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_SESSION_EXPIRY } from '../../../auth/constants/auth.constants';
import { AuthService } from '../services/auth.service';

// Adds the Bearer token to backend requests and sends the user to login when the backend answers 401.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  const authService = inject(AuthService);
  const token = authService.getAccessToken();
  const authorized = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.context.get(SKIP_SESSION_EXPIRY)) {
        authService.expireSession();
      }
      return throwError(() => error);
    })
  );
};
