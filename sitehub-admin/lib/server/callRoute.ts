import { NextRequest } from "next/server";

type RouteContext = { params: Promise<Record<string, string>> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, ctx: any) => Promise<Response> | Response;

/**
 * Runs an API route handler in this server process instead of fetching it over HTTP.
 * Route handlers read the caller from `cookies()`, which resolves to the current page or
 * action request, so the same user and permission checks apply.
 */
export async function callRoute(
  handler: RouteHandler,
  path: string,
  init: { method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<Response> {
  const hasBody = init.body !== undefined;
  const req = new NextRequest(new URL(path, "http://localhost"), {
    method: init.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  const ctx: RouteContext = { params: Promise.resolve(init.params ?? {}) };
  return handler(req, ctx);
}

/** `callRoute` for list endpoints: the JSON array, or `[]` on any failure. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callRouteList<T = any>(handler: RouteHandler, path: string): Promise<T[]> {
  try {
    const res = await callRoute(handler, path);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (e) {
    console.error(`callRouteList ${path}:`, e);
    return [];
  }
}
