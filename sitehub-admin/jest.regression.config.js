/** Jest config for regression tests - uses node env and mocks */
/* eslint-disable @typescript-eslint/no-require-imports */
const base = require("./jest.config.js");
module.exports = {
  ...base,
  testEnvironment: "node",
  testMatch: ["**/*.regression.test.[jt]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@/lib/supabase$": "<rootDir>/tests/mocks/supabase.ts",
    "^@/lib/supabaseClient$": "<rootDir>/tests/mocks/supabase.ts",
    "^@/lib/supabaseAdmin$": "<rootDir>/tests/mocks/supabase.ts",
    "^next/headers$": "<rootDir>/tests/mocks/next-headers.ts",
  },
};
