import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthUser } from '../../auth/models/auth.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { DEFAULT_MATCH_QUERY } from '../constants/matches.constants';
import { MatchListStateService } from './match-list-state.service';

describe('MatchListStateService', () => {
  const currentUser = signal<AuthUser | null>({ id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' });
  let state: MatchListStateService;

  beforeEach(() => {
    currentUser.set({ id: 'u1', email: 'admin@buzzer.dev', role: 'ADMIN' });
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { currentUser } }] });
    state = TestBed.inject(MatchListStateService);
    TestBed.tick();
  });

  it('keeps the tab, page and order while the session lasts', () => {
    state.query.set({ ...DEFAULT_MATCH_QUERY, status: 'LIVE', page: 2 });
    TestBed.tick();
    expect(state.query()).toMatchObject({ status: 'LIVE', page: 2 });
  });

  it('starts again on All, page 1 once the session ends', () => {
    state.query.set({ ...DEFAULT_MATCH_QUERY, status: 'SCHEDULED', page: 2, sortBy: 'scheduledAt' });
    currentUser.set(null);
    TestBed.tick();
    expect(state.query()).toEqual(DEFAULT_MATCH_QUERY);

    // The next account signs in to a fresh list.
    currentUser.set({ id: 'u2', email: 'viewer@buzzer.dev', role: 'VIEWER' });
    TestBed.tick();
    expect(state.query()).toEqual(DEFAULT_MATCH_QUERY);
  });
});
