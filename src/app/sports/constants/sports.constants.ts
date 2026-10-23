import { SportQuery } from '../models/sport.model';

export const SPORTS_PAGE_SIZE = 10;

export const DEFAULT_SPORT_QUERY: SportQuery = {
  search: '',
  page: 1,
  limit: SPORTS_PAGE_SIZE,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// Roles the backend lets create, edit and delete sports (VIEWER and ORG get 403).
export const SPORT_EDITOR_ROLES = ['ADMIN', 'OPERATOR'] as const;

// Row accents come from the design system palette, picked per sport, since the API stores no colour.
export const SPORT_ACCENTS = ['var(--color-yellow)', 'var(--color-green)', 'var(--color-orange)', 'var(--color-red)'];
