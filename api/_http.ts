export type ApiRequest = {
  method?: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

export function applyCors(req: ApiRequest, res: ApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}

export function json(res: ApiResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

export function getPathSegments(req: ApiRequest) {
  const rewrittenPath = req.query.path;
  const rawPath = Array.isArray(rewrittenPath) ? rewrittenPath.join("/") : rewrittenPath;
  const path = rawPath || String(req.url || "").split("?")[0].replace(/^\/api\/?/, "");
  return path.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
}

export function readBody<T>(req: ApiRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === "string") return JSON.parse(req.body) as T;
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8")) as T;
  return req.body as T;
}

export function methodNotAllowed(res: ApiResponse) {
  return json(res, 405, { error: "Method not allowed" });
}

export function notFound(res: ApiResponse) {
  return json(res, 404, { error: "Not found" });
}

export function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value || "");
}
