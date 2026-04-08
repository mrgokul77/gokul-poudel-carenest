const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

/**
 * Converts backend-stored media paths into browser-loadable URLs.
 * Examples:
 * - profiles/a.jpg -> http://localhost:8000/uploads/profiles/a.jpg
 * - /uploads/profiles/a.jpg -> http://localhost:8000/uploads/profiles/a.jpg
 */
export const resolveBackendMediaUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const clean = value.replace(/^\/+/, "");

  if (clean.startsWith("uploads/")) {
    return `${API_BASE}/${clean}`;
  }

  if (clean.startsWith("media/")) {
    return `${API_BASE}/uploads/${clean.slice("media/".length)}`;
  }

  return `${API_BASE}/uploads/${clean}`;
};
