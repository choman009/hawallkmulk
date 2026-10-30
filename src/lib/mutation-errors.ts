import type { TextKey } from "./i18n";

// Supabase rejects with plain PostgREST error objects, not necessarily Error.
// Translate categories rather than displaying messages that may contain contact data.
export function mutationErrorKey(error: unknown): TextKey {
  const value =
    error && typeof error === "object"
      ? (error as { code?: string; message?: string })
      : {};
  if (["PGRST204", "42703", "PGRST202", "42883"].includes(value.code ?? ""))
    return "schemaUpdateRequired";
  if (value.code === "42501" || value.message === "permissionDenied")
    return "permissionDenied";
  if (
    ["PGRST301", "PGRST302", "PGRST303"].includes(value.code ?? "") ||
    value.message === "sessionError"
  )
    return "sessionError";
  if (["23514", "23502", "22P02", "22003"].includes(value.code ?? ""))
    return "validationError";
  if (value.code === "23503") return "linkedRecordError";
  return "genericError";
}
