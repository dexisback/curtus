export function isMissingLibraryTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; meta?: { table?: string }; message?: string };
  if (maybe.code !== "P2021") return false;
  const table = maybe.meta?.table ?? "";
  if (table === "public.library_items" || table === "library_items") return true;
  const msg = maybe.message ?? "";
  return msg.includes("library_items");
}

// — Helpers for gracefully handling library table rollout/migration states.
