import { SortOrder } from '../../common/models/api.model';

export interface Sport {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Counts the backend adds to each list item (not in the OpenAPI spec).
  governingBodyCount: number;
  organizationCount: number;
  teamCount: number;
  participantCount: number;
}

// Body for POST and PATCH. The API rejects empty or null icon URLs, so iconUrl is left out when blank.
export interface SportInput {
  name: string;
  description?: string;
  iconUrl?: string;
}

// The API can only sort sports by these fields; sorting by a count fails on the server.
export type SportSortField = 'name' | 'createdAt';

export interface SportQuery {
  search: string;
  page: number;
  limit: number;
  sortBy: SportSortField;
  sortOrder: SortOrder;
}

export interface CatalogueTotals {
  sports: number;
  governingBodies: number;
  organisations: number;
  participants: number;
}
