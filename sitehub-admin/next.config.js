/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // Next defaults to 10MB for request body cloning; larger multipart uploads were truncated (RAMS etc.).
  // Must be ≥ app limits in lib/ramsUploadLimits.ts and any other large upload routes.
  experimental: {
    proxyClientMaxBodySize: '55mb',
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  async headers() {
    // HSTS + strict CSP on http://localhost can confuse browsers and break static assets in dev.
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Private buckets use signed URLs: /storage/v1/object/sign/<bucket>/... (not .../public/...).
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
      { protocol: 'https', hostname: '*.supabase.in', pathname: '/storage/v1/object/**' },
    ],
  },
};

module.exports = nextConfig;
