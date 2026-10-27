import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client';
import { AuthService } from '../../core/auth/services/auth.service';
import { MatchLiveUpdate } from '../models/match-event.model';
import { matchEvent } from '../testing/match.fixtures';
import { MATCH_SOCKET_FACTORY, MatchLiveService } from './match-live.service';

type Listener = (payload?: unknown) => void;

// Just enough of a Socket.IO client: listeners, emitted messages and the connection state.
class FakeSocket {
  connected = false;
  readonly emitted: [string, unknown][] = [];
  readonly listeners = new Map<string, Set<Listener>>();
  disconnected = false;

  on(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, payload: unknown): this {
    this.emitted.push([event, payload]);
    return this;
  }

  disconnect(): this {
    this.disconnected = true;
    return this;
  }

  // A message from the server.
  receive(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  listenerCount(): number {
    return [...this.listeners.values()].reduce((count, set) => count + set.size, 0);
  }
}

describe('MatchLiveService', () => {
  let service: MatchLiveService;
  let sockets: FakeSocket[];
  let tokens: (string | null)[];

  beforeEach(() => {
    sockets = [];
    tokens = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getAccessToken: () => 'jwt-1' } },
        {
          provide: MATCH_SOCKET_FACTORY,
          useValue: (getToken: () => string | null) => {
            tokens.push(getToken());
            const socket = new FakeSocket();
            sockets.push(socket);
            return socket as unknown as Socket;
          },
        },
      ],
    });
    service = TestBed.inject(MatchLiveService);
  });

  it('joins the match once connected, with the JWT in the handshake', () => {
    const subscription = service.watch$('m1').subscribe();
    expect(tokens).toEqual(['jwt-1']);
    expect(sockets[0].emitted).toEqual([]);

    sockets[0].connected = true;
    sockets[0].receive('connect');
    expect(sockets[0].emitted).toEqual([['match:join', 'm1']]);
    subscription.unsubscribe();
  });

  it("reports the match's events, score and status, and ignores other matches", () => {
    const updates: MatchLiveUpdate[] = [];
    const subscription = service.watch$('m1').subscribe((update) => updates.push(update));
    const socket = sockets[0];
    const scoreboard = {
      matchId: 'm1',
      status: 'LIVE',
      home: { team: 'A', score: 1 },
      away: { team: 'B', score: 0 },
      startedAt: null,
    };

    socket.receive('match:event', matchEvent('e1', 5));
    socket.receive('match:event', matchEvent('e2', 6, { matchId: 'other' }));
    socket.receive('match:scoreboard', scoreboard);
    socket.receive('match:status', { id: 'm1', status: 'FINISHED' });
    socket.receive('match:status', { id: 'other', status: 'LIVE' });

    expect(updates).toEqual([
      { kind: 'event', event: matchEvent('e1', 5) },
      { kind: 'scoreboard', scoreboard },
      { kind: 'status', status: 'FINISHED' },
    ]);
    subscription.unsubscribe();
  });

  it('leaves the match and removes its listeners when unsubscribed, so nothing arrives twice later', () => {
    const first: MatchLiveUpdate[] = [];
    const subscription = service.watch$('m1').subscribe((update) => first.push(update));
    const socket = sockets[0];
    socket.connected = true;
    subscription.unsubscribe();

    expect(socket.emitted).toContainEqual(['match:leave', 'm1']);
    expect(socket.listenerCount()).toBe(0);
    expect(socket.disconnected).toBe(true);

    // Coming back opens a new connection with one set of listeners.
    const again: MatchLiveUpdate[] = [];
    const second = service.watch$('m1').subscribe((update) => again.push(update));
    sockets[1].receive('match:event', matchEvent('e1', 5));
    socket.receive('match:event', matchEvent('e1', 5));
    expect(again.length).toBe(1);
    expect(first.length).toBe(0);
    second.unsubscribe();
  });

  it('shares one connection while matches are watched and joins again after a reconnect', () => {
    const one = service.watch$('m1').subscribe();
    const two = service.watch$('m2').subscribe();
    expect(sockets.length).toBe(1);
    const socket = sockets[0];

    socket.receive('connect');
    expect(socket.emitted).toEqual([
      ['match:join', 'm1'],
      ['match:join', 'm2'],
    ]);

    one.unsubscribe();
    expect(socket.disconnected).toBe(false);
    two.unsubscribe();
    expect(socket.disconnected).toBe(true);
  });
});
