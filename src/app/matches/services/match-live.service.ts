import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatchEvent, MatchLiveUpdate, MatchScoreboard, MatchStatusUpdate } from '../models/match-event.model';

// The backend's Socket.IO server sits at the root of its address (default /socket.io path), not under /api.
export const MATCH_SOCKET_URL = new URL(environment.apiBaseUrl).origin;

// Opens the connection, sending the current JWT in the handshake as auth.token (read again on every reconnect).
// Tests replace it with a fake socket.
export const MATCH_SOCKET_FACTORY = new InjectionToken<(getToken: () => string | null) => Socket>(
  'MATCH_SOCKET_FACTORY',
  {
    providedIn: 'root',
    factory: () => (getToken) => io(MATCH_SOCKET_URL, { auth: (callback) => callback({ token: getToken() }) }),
  }
);

// Real-time updates for the match pages. One connection is shared while any match is watched, and closed after.
@Injectable({ providedIn: 'root' })
export class MatchLiveService {
  private readonly authService = inject(AuthService);
  private readonly createSocket = inject(MATCH_SOCKET_FACTORY);
  private socket: Socket | null = null;
  private watchers = 0;

  // Subscribing joins the match's room (match:join) and reports its events, score and status as they happen;
  // unsubscribing leaves the room (match:leave) and removes the listeners, so nothing arrives twice later.
  watch$(matchId: string): Observable<MatchLiveUpdate> {
    return new Observable<MatchLiveUpdate>((subscriber) => {
      const socket = this.connect();
      const join = (): void => {
        socket.emit('match:join', matchId);
      };
      const onEvent = (event: MatchEvent): void => {
        if (event.matchId === matchId) subscriber.next({ kind: 'event', event });
      };
      const onScoreboard = (scoreboard: MatchScoreboard): void => {
        if (scoreboard.matchId === matchId) subscriber.next({ kind: 'scoreboard', scoreboard });
      };
      const onStatus = (update: MatchStatusUpdate): void => {
        if (update.id === matchId) subscriber.next({ kind: 'status', status: update.status });
      };

      // Rooms don't survive a reconnect, so the match is joined again on every connect.
      socket.on('connect', join);
      socket.on('match:event', onEvent);
      socket.on('match:scoreboard', onScoreboard);
      socket.on('match:status', onStatus);
      if (socket.connected) {
        join();
      }

      return () => {
        socket.emit('match:leave', matchId);
        socket.off('connect', join);
        socket.off('match:event', onEvent);
        socket.off('match:scoreboard', onScoreboard);
        socket.off('match:status', onStatus);
        this.release();
      };
    });
  }

  private connect(): Socket {
    this.watchers++;
    this.socket ??= this.createSocket(() => this.authService.getAccessToken());
    return this.socket;
  }

  private release(): void {
    this.watchers--;
    if (this.watchers === 0) {
      this.socket?.disconnect();
      this.socket = null;
    }
  }
}
