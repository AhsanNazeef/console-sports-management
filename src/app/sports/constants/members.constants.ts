import { StaffCategory } from '../models/member.model';

// Roles the backend lets manage squad and staff (OPERATOR and VIEWER get 403). An ORG account can manage any club.
export const MEMBER_EDITOR_ROLES = ['ADMIN', 'ORG'] as const;

// Section titles from the Figma Staff page, in the order the backend groups staff.
export const STAFF_CATEGORY_LABELS: Record<StaffCategory, string> = {
  club_president: 'Club President',
  executive_management: 'Executive Management',
  operations_administration: 'Operations & Administration',
};

export const STAFF_CATEGORIES = Object.keys(STAFF_CATEGORY_LABELS) as StaffCategory[];

// Searching for a user to add to the squad: matches shown, letters needed and the pause before searching.
export const USER_SEARCH_LIMIT = 8;
export const USER_SEARCH_MIN_LENGTH = 2;
export const USER_SEARCH_DEBOUNCE_MS = 300;
