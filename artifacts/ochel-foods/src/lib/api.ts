let raw = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

// If the env var is set but missing a protocol (e.g. "example.up.railway.app"),
// the browser treats it as a relative path and Railway is never reached.
// Always ensure we have a full https:// URL.
if (raw && !raw.startsWith("http")) {
  raw = "https://" + raw;
}

const API_BASE = raw;

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
