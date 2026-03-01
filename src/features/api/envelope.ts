export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  data: T | null;
  error: ApiError | null;
};

export function ok<T>(data: T): ApiEnvelope<T> {
  return { data, error: null };
}

export function fail(code: string, message: string, details?: unknown): ApiEnvelope<null> {
  return {
    data: null,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}
