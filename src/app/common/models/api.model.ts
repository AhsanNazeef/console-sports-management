// Response envelopes used by every backend endpoint.
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    message: string;
    details?: Record<string, string[]> | null;
  };
}

export type SortOrder = 'asc' | 'desc';
