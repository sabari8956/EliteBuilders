export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiSuccess<T> = {
  data: T;
  error: null;
};

export type ApiFailure = {
  data: null;
  error: ApiError;
};

export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiFailure {
  return { data: null, error: { code, message, details } };
}
