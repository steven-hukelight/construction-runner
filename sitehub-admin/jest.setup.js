/* eslint-disable @typescript-eslint/no-require-imports */
// Load .env files so RLS tests get SUPABASE_SERVICE_ROLE_KEY etc.
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

require("@testing-library/jest-dom");

// Polyfills for Next.js / Node test environment
if (typeof globalThis.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Web fetch/Request/Response polyfills for Node test environment (align with Next.js runtime)
if (typeof globalThis.fetch === "undefined") {
  // undici requires ReadableStream; Node 18+ provides it via stream/web
  if (typeof globalThis.ReadableStream === "undefined") {
    try {
      const { ReadableStream } = require("stream/web");
      globalThis.ReadableStream = ReadableStream;
    } catch {
      /* ignore */
    }
  }
  try {
    const { fetch, Headers, Request, Response, FormData, File, Blob } = require("undici");
    globalThis.fetch = fetch;
    globalThis.Headers = Headers;
    globalThis.Request = Request;
    globalThis.Response = Response;
    globalThis.FormData = FormData || globalThis.FormData;
    globalThis.File = File || globalThis.File;
    globalThis.Blob = Blob || globalThis.Blob;
  } catch {
    const fetch = require("node-fetch");
    globalThis.fetch = fetch;
    globalThis.Headers = fetch.Headers;
    globalThis.Request = fetch.Request;
    globalThis.Response = fetch.Response;
  }
}

// Crypto polyfill for Web Crypto APIs used by Next.js
if (typeof globalThis.crypto === "undefined") {
  const { webcrypto } = require("node:crypto");
  globalThis.crypto = webcrypto;
}


// Provide test env vars; prefer NEXT_PUBLIC_* so .env values are used
process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTU3MzQ1MjAwfQ.test";