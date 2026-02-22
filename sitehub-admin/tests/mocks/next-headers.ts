/**
 * Mock for next/headers - cookies() returns a store that reads from mockCookieStore.
 */
import { mockCookieStore } from "./cookie-store";

function getCookieStore() {
  return {
    get: (name: string) => {
      const value = mockCookieStore[name];
      return value != null ? { value } : undefined;
    },
    getAll: () =>
      Object.entries(mockCookieStore).map(([name, value]) => ({ name, value: String(value) })),
  };
}

export async function cookies() {
  return getCookieStore();
}
