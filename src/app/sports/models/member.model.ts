// A club's squad and staff (the Organisation detail page's Squad and Staff tabs).
// Squad members are user accounts; photo and age come from their athlete profile and are null without one.

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface SquadMember extends Timestamps {
  id: string;
  organizationId: string;
  userId: string;
  position: string;
  agreementEnd: string | null;
  displayName: string;
  email: string;
  photoUrl: string | null;
  age: number | null;
}

export interface NewSquadMember {
  userId: string;
  position: string;
  agreementEnd?: string;
}

export interface SquadMemberChanges {
  position: string;
  // null clears it.
  agreementEnd: string | null;
}

// What the squad popup emits: a user is picked only when adding.
export interface SquadMemberFormValue {
  userId: string | null;
  position: string;
  agreementEnd: string | null;
}

export type StaffCategory = 'club_president' | 'executive_management' | 'operations_administration';

export interface StaffMember extends Timestamps {
  id: string;
  organizationId: string;
  name: string;
  roleTitle: string;
  category: StaffCategory;
  nationality: string | null;
  photoUrl: string | null;
}

export interface StaffGroup {
  category: StaffCategory;
  members: StaffMember[];
}

// The staff endpoint returns the same people twice: a flat list and the same list grouped by category.
export interface StaffList {
  data: StaffMember[];
  groups: StaffGroup[];
}

export interface StaffMemberInput {
  name: string;
  roleTitle: string;
  category: StaffCategory;
  // null clears it when editing; the backend rejects an empty photo URL.
  nationality: string | null;
  photoUrl: string | null;
}

// A user account, as GET /users lists it; used to pick a squad member.
export interface UserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}
