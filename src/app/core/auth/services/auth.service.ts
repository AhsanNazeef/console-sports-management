import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, UrlTree } from '@angular/router';
import { catchError, EMPTY, map, Observable, Subject, switchMap, tap, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ACCESS_TOKEN_KEY,
  HOME_PATH,
  LOGIN_PATH,
  REFRESH_TOKEN_KEY,
  SESSION_EXPIRED_MESSAGE,
  SKIP_SESSION_EXPIRY,
} from '../../../auth/constants/auth.constants';
import { AuthUser, LoginResult } from '../../../auth/models/auth.model';
import { ApiResponse } from '../../../common/models/api.model';
import { CacheService } from '../../../common/services/cache.service';
import { getTokenExpiry } from '../../../common/utils/jwt.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cache = inject(CacheService);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;
  private readonly expiryChanges = new Subject<number | null>();
  private pendingMessage: string | null = null;

  readonly currentUser = signal<AuthUser | null>(null);

  constructor() {
    // Ends the session when the access token expires, even if no request runs into the 401.
    this.expiryChanges
      .pipe(
        switchMap((expiresAt) => (expiresAt === null ? EMPTY : timer(new Date(expiresAt)))),
        takeUntilDestroyed()
      )
      .subscribe(() => this.expireSession());
    if (this.hasSession()) {
      this.watchExpiry(this.getAccessToken());
    }
  }

  login$(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<ApiResponse<LoginResult>>(`${this.authUrl}/login`, { email, password }, { context: skipSessionExpiry() })
      .pipe(
        map((response) => response.data),
        tap((result) => this.startSession(result)),
        map((result) => result.user)
      );
  }

  loadCurrentUser$(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.authUrl}/me`, { context: skipSessionExpiry() }).pipe(
      map((response) => response.data),
      tap((user) => this.currentUser.set(user))
    );
  }

  signOut(): void {
    const refreshToken = this.cache.get<string>(REFRESH_TOKEN_KEY, 'session');
    if (refreshToken) {
      // Revokes the refresh token on the server; the local session ends either way.
      this.http
        .post(`${this.authUrl}/logout`, { refreshToken }, { context: skipSessionExpiry() })
        .pipe(catchError(() => EMPTY))
        .subscribe();
    }
    this.endSession(null);
    void this.router.navigateByUrl(LOGIN_PATH);
  }

  // Called when the backend rejects the token: back to login, then return to the same page.
  expireSession(): void {
    if (!this.getAccessToken()) {
      return;
    }
    const returnUrl = this.router.url;
    this.endSession(SESSION_EXPIRED_MESSAGE);
    void this.router.navigateByUrl(this.loginUrlTree(returnUrl));
  }

  getAccessToken(): string | null {
    return this.cache.get<string>(ACCESS_TOKEN_KEY, 'session');
  }

  hasSession(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }
    const expiresAt = getTokenExpiry(token);
    if (expiresAt !== null && expiresAt <= Date.now()) {
      this.endSession(SESSION_EXPIRED_MESSAGE);
      return false;
    }
    return true;
  }

  endSession(message: string | null): void {
    this.cache.remove(ACCESS_TOKEN_KEY, 'session');
    this.cache.remove(REFRESH_TOKEN_KEY, 'session');
    this.currentUser.set(null);
    this.expiryChanges.next(null);
    this.pendingMessage = message;
  }

  // Message for the login page about why the session ended; read once.
  consumeMessage(): string | null {
    const message = this.pendingMessage;
    this.pendingMessage = null;
    return message;
  }

  // The login address, carrying the page to return to unless that's where login leads anyway.
  loginUrlTree(returnUrl: string): UrlTree {
    const isDefault = ['', '/', HOME_PATH].includes(returnUrl) || returnUrl.startsWith(LOGIN_PATH);
    return this.router.createUrlTree([LOGIN_PATH], { queryParams: isDefault ? {} : { returnUrl } });
  }

  private startSession({ accessToken, refreshToken, user }: LoginResult): void {
    this.cache.set(ACCESS_TOKEN_KEY, accessToken, 'session');
    this.cache.set(REFRESH_TOKEN_KEY, refreshToken, 'session');
    this.currentUser.set(user);
    this.watchExpiry(accessToken);
  }

  private watchExpiry(token: string | null): void {
    this.expiryChanges.next(token ? getTokenExpiry(token) : null);
  }
}

function skipSessionExpiry(): HttpContext {
  return new HttpContext().set(SKIP_SESSION_EXPIRY, true);
}
