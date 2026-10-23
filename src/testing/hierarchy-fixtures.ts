// Test helpers: sample records and list envelopes for the drill-down pages.
import { ApiListResponse } from '../app/common/models/api.model';
import { GoverningBody, Organisation, Participant, Team } from '../app/sports/models/hierarchy.model';
import { Sport } from '../app/sports/models/sport.model';

const DATES = { createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-02T09:00:00Z' };

export function listOf<T>(items: T[], total = items.length): ApiListResponse<T> {
  return {
    success: true,
    data: items,
    meta: { page: 1, limit: 10, total, totalPages: Math.max(1, Math.ceil(total / 10)) },
  };
}

export const sampleSport = (overrides: Partial<Sport> = {}): Sport => ({
  id: 's1',
  name: 'Football',
  description: 'Played with a round ball.',
  iconUrl: null,
  governingBodyCount: 1,
  organizationCount: 1,
  teamCount: 1,
  participantCount: 1,
  ...DATES,
  ...overrides,
});

export const sampleGoverningBody = (overrides: Partial<GoverningBody> = {}): GoverningBody => ({
  id: 'g1',
  name: 'UEFA',
  country: 'Europe',
  sportId: 's1',
  sport: { id: 's1', name: 'Football' },
  organizationCount: 3,
  teamCount: 4,
  participantCount: 40,
  ...DATES,
  ...overrides,
});

export const sampleTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 't1',
  name: 'First XI',
  shortName: null,
  logoUrl: null,
  organizationId: 'o1',
  ...DATES,
  ...overrides,
});

export const sampleOrganisation = (overrides: Partial<Organisation> = {}): Organisation => ({
  id: 'o1',
  name: 'Premier League',
  city: 'London',
  country: null,
  type: null,
  crestUrl: null,
  governingBodyId: 'g1',
  governingBody: { id: 'g1', name: 'UEFA', sportId: 's1' },
  teams: [sampleTeam()],
  teamCount: 1,
  participantCount: 2,
  ...DATES,
  ...overrides,
});

export const sampleParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'p1',
  firstName: 'Ana',
  lastName: 'Silva',
  jerseyNumber: 9,
  position: 'Forward',
  teamId: 't1',
  team: sampleTeam(),
  ...DATES,
  ...overrides,
});
