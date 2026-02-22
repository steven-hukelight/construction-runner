/** Jest config for performance tests – API and database. Uses real Supabase when env vars are set. */
const base = require("./jest.integration.config.js");
module.exports = {
  ...base,
  testMatch: ["**/tests/performance/**/*.performance.test.[jt]s"],
  testTimeout: 15000,
};
