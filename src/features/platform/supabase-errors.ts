export function isSupabaseSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { code?: string; message?: string };
  return maybe.code === "PGRST205" || maybe.code === "42P01" || /schema cache|does not exist|relation/i.test(maybe.message ?? "");
}
