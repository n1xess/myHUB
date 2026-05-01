const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${configuredBaseUrl}/api${normalizedPath}`;
}

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "") ?? "";
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}
