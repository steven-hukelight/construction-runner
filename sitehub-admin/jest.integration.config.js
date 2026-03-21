/* eslint-disable @typescript-eslint/no-require-imports */
/** Jest config for integration tests – uses real Supabase when env vars are set */
const base = require("./jest.config.js");
module.exports = {
  ...base,
  testEnvironment: "node",
  testMatch: ["**/*.integration.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@/lib/supabase$": "<rootDir>/tests/mocks/supabase.ts",
    "^@/lib/supabaseClient$": "<rootDir>/tests/mocks/supabase.ts",
    // Do NOT mock supabaseAdmin – integration tests use real Supabase
    "^next/headers$": "<rootDir>/tests/mocks/next-headers.ts",
  },
};
