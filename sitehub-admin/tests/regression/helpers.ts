/**
 * Helpers for regression tests - cookie mocking and request building.
 */
import { mockCookieStore } from "../mocks/cookie-store";

export function setMockCookies(cookies: Record<string, string>) {
  Object.assign(mockCookieStore, cookies);
}

export function clearMockCookies() {
  Object.keys(mockCookieStore).forEach((k) => delete mockCookieStore[k]);
}

export function getMockCookie(name: string): string | undefined {
  return mockCookieStore[name];
}

/**
 * Create a Request for testing API routes.
 */
export function jsonRequest(
  url: string,
  init: { method?: string; body?: object; headers?: Record<string, string> } = {}
) {
  const { method = "GET", body, headers = {} } = init;
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Create a FormData Request for file upload tests.
 */
export function formDataRequest(
  url: string,
  fields: Record<string, string | Blob>,
  init: { method?: string } = {}
) {
  const { method = "POST" } = init;
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }
  return new Request(url, { method, body: form });
}
