// Response envelopes used by every backend endpoint.
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    message: string;
    details?: Record<string, string[]> | null;
  };
}
