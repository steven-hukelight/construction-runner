/**
 * Get the absolute URL for API calls in server components
 * Falls back to localhost in development
 */
export function getBaseUrl(): string {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  // Prefer localhost when running locally to avoid hitting production domains during dev/SSR.
  if (!isProd) {
    return "http://localhost:3000";
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
