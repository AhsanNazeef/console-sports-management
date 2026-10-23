import { HttpContextToken } from '@angular/common/http';

export const LOGIN_PATH = '/login';
export const HOME_PATH = '/dashboard';

// Kept in sessionStorage: the session survives a refresh and ends when the tab closes.
export const ACCESS_TOKEN_KEY = 'buzzer.accessToken';
export const REFRESH_TOKEN_KEY = 'buzzer.refreshToken';

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';
export const SESSION_CHECK_FAILED_MESSAGE = "We couldn't check your session. Please log in again.";

// Marks auth requests whose errors the caller handles, so the interceptor doesn't redirect on their 401.
export const SKIP_SESSION_EXPIRY = new HttpContextToken<boolean>(() => false);
