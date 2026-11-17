import { Location } from '@angular/common';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, UrlTree } from '@angular/router';
import { catchError, EMPTY, forkJoin, map, Observable, of, Subject, switchMap, tap, throwError, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ACCESS_TOKEN_KEY,
  HOME_PATH,
  LOGIN_PATH,
  REFRESH_TOKEN_KEY,
  SESSION_EXPIRED_MESSAGE,
  SKIP_SESSION_EXPIRY,
} from '../../../auth/constants/auth.constants';
import { AccessAction } from '../../../auth/constants/access.constants';
import {
  AuthUser,
  LinkedOrganisation,
  LoginResult,
  UserAccess,
  UserPermissions,
} from '../../../auth/models/auth.model';
import { SKIP_HTTP_NOTICE } from '../../../common/constants/http.constants';
import { ApiResponse } from '../../../common/models/api.model';
import { CacheService } from '../../../common/services/cache.service';
import { HttpNoticeService } from '../../../common/services/http-notice.service';
import { getTokenExpiry } from '../../../common/utils/jwt.util';
import { AccessContext, canPerform } from '../utils/access.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cache = inject(CacheService);
  private readonly notices = inject(HttpNoticeService);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;
  private readonly expiryChanges = new Subject<number | null>();
  private pendingMessage: string | null = null;

  // Set once the user and their access have loaded (or the access load has failed).
  readonly currentUser = signal<AuthUser | null>(null);
  // Until it loads, no page or action that needs it is allowed.
  private readonly access = signal<UserAccess | null>(null);
  // Why the access couldn't be loaded; the shell offers to load it again.
  readonly accessError = signal<HttpErrorResponse | null>(null);

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

  // Signs in, then reads the role from GET /auth/me like a page load does. If that fails, no session is kept.
  login$(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<ApiResponse<LoginResult>>(`${this.authUrl}/login`, { email, password }, { context: authContext() })
      .pipe(
        tap((response) => this.startSession(response.data)),
        switchMap(() => this.loadCurrentUser$()),
        catchError((error: unknown) => {
          this.endSession(null);
          return throwError(() => error);
        })
      );
  }

  loadCurrentUser$(): Observable<AuthUser> {
    return this.http.get<ApiResponse<AuthUser>>(`${this.authUrl}/me`, { context: authContext() }).pipe(
      map((response) => response.data),
      switchMap((user) => this.loadAccess$(user).pipe(map(() => user))),
      tap((user) => this.currentUser.set(user))
    );
  }

  // Loads the signed-in user's access again after it failed.
  reloadAccess$(): Observable<void> {
    const user = this.currentUser();
    return user ? this.loadAccess$(user) : EMPTY;
  }

  signOut(): void {
    const refreshToken = this.cache.get<string>(REFRESH_TOKEN_KEY, 'session');
    if (refreshToken) {
      // Revokes the refresh token on the server; the local session ends either way.
      this.http
        .post(`${this.authUrl}/logout`, { refreshToken }, { context: authContext() })
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
    // The address bar, not router.url: drill-down pages are reached without changing the address.
    const returnUrl = this.location.path();
    this.endSession(SESSION_EXPIRED_MESSAGE);
    void this.router.navigateByUrl(this.loginUrlTree(returnUrl));
  }

  // Whether the signed-in user may take an action (ACCESS_RULES). Reads signals, so it works inside computed().
  can(action: AccessAction, context?: AccessContext): boolean {
    return canPerform(action, this.currentUser(), this.access(), context);
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
    this.access.set(null);
    this.accessError.set(null);
    this.notices.dismiss();
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

  private startSession({ accessToken, refreshToken }: LoginResult): void {
    this.cache.set(ACCESS_TOKEN_KEY, accessToken, 'session');
    this.cache.set(REFRESH_TOKEN_KEY, refreshToken, 'session');
    this.watchExpiry(accessToken);
  }

  // The permission list, and for an ORG account its club. If either request fails, the access stays empty, so no
  // page or action that needs it shows, and accessError says why.
  private loadAccess$(user: AuthUser): Observable<void> {
    const context = new HttpContext().set(SKIP_HTTP_NOTICE, true);
    const permissions$ = this.http
      .get<ApiResponse<UserPermissions>>(`${environment.apiBaseUrl}/users/${user.id}/permissions`, { context })
      .pipe(map((response) => response.data.permissions));
    const organisationId$ = user.role === 'ORG' ? this.linkedOrganisationId$(context) : of(null);
    return forkJoin({ permissions: permissions$, organisationId: organisationId$ }).pipe(
      map((access) => {
        this.access.set(access);
        this.accessError.set(null);
      }),
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse)) {
          return throwError(() => error);
        }
        this.access.set(null);
        this.accessError.set(error);
        return of(undefined);
      })
    );
  }

  // GET /organization answers 403 for an ORG account that isn't linked to a club.
  private linkedOrganisationId$(context: HttpContext): Observable<string | null> {
    return this.http.get<ApiResponse<LinkedOrganisation>>(`${environment.apiBaseUrl}/organization`, { context }).pipe(
      map((response) => response.data.id),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 403 ? of(null) : throwError(() => error)
      )
    );
  }

  private watchExpiry(token: string | null): void {
    this.expiryChanges.next(token ? getTokenExpiry(token) : null);
  }
}

// Auth requests: their callers handle a 401 and every other error themselves.
function authContext(): HttpContext {
  return new HttpContext().set(SKIP_SESSION_EXPIRY, true).set(SKIP_HTTP_NOTICE, true);
}
