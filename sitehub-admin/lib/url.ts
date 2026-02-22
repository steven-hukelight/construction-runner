/**
 * Get the absolute URL for API calls in server components
 * Falls back to localhost in development
 */
export function getBaseUrl(): string {
  // In production, use environment variables
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  
  // In development, use localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Default to localhost for development
  return 'http://localhost:3000';
}
