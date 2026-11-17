import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_HTTP_NOTICE } from '../../common/constants/http.constants';
import { HttpNoticeService } from '../../common/services/http-notice.service';

// Turns a 403 or 429 from the backend into the console-wide message, unless the request is marked SKIP_HTTP_NOTICE
// because its page or popup shows the error itself. The error still reaches the caller.
export const httpNoticeInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl) || request.context.get(SKIP_HTTP_NOTICE)) {
    return next(request);
  }
  const notices = inject(HttpNoticeService);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 403 || error.status === 429)) {
        notices.show(error.status);
      }
      return throwError(() => error);
    })
  );
};
