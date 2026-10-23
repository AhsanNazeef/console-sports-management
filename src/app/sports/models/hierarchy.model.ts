// The backend's hierarchy: Sport → Governing Body → Organisation → Team → Player.
// "Participants" in the brief are players: that's what the backend's participantCount counts.

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface GoverningBody extends Timestamps {
  id: string;
  name: string;
  country: string | null;
  sportId: string;
  sport?: { id: string; name: string };
  // Counts the backend adds to list items (not in the OpenAPI spec).
  organizationCount?: number;
  teamCount?: number;
  participantCount?: number;
}

export interface Organisation extends Timestamps {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  type: string | null;
  crestUrl: string | null;
  governingBodyId: string;
  governingBody?: { id: string; name: string; sportId: string };
  teams?: Team[];
  teamCount?: number;
  participantCount?: number;
}

export interface Team extends Timestamps {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  organizationId: string;
}

export interface Participant extends Timestamps {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  teamId: string;
  team?: Team;
}

export interface GoverningBodyInput {
  name: string;
  sportId: string;
  country?: string;
}

export interface OrganisationInput {
  name: string;
  governingBodyId: string;
  city?: string;
}

export interface TeamInput {
  name: string;
  organizationId: string;
}

export interface ParticipantInput {
  firstName: string;
  lastName: string;
  teamId: string;
  position?: string;
  jerseyNumber?: number;
}

// What the Add Participant popup sends: an existing team, or the name of a team to create first.
export interface NewParticipant {
  participant: Omit<ParticipantInput, 'teamId'>;
  teamId: string | null;
  newTeamName: string | null;
}

export interface ChildListQuery {
  search: string;
  page: number;
  limit: number;
}

export interface SportCounts {
  governingBodies: number;
  organisations: number;
  participants: number;
}

export interface GoverningBodyCounts {
  organisations: number;
  participants: number;
}
