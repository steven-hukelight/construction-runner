/**
 * Database performance tests – verify indexes exist and queries use them.
 * Requires: DATABASE_URL or SUPABASE_DB_URL for index/EXPLAIN checks.
 * Run: npm run test:performance
 */
import { hasApiIntegrationEnv } from "../integration/env";

const run = hasApiIntegrationEnv();
const hasDbUrl = () =>
  !!(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL)?.trim();

/** Check index exists by querying pg_indexes via raw pg */
async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!conn) return false;
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: conn });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
      [tableName, indexName]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    await client.end();
  }
}

/** Run EXPLAIN ANALYZE and check for Seq Scan on large tables */
function hasSequentialScan(plan: string): boolean {
  return /Seq Scan|seq_scan/i.test(plan);
}

(run && hasDbUrl() ? describe : describe.skip)("Database Performance", () => {
  it("has index on tasks(company_id)", async () => {
    const exists = await indexExists("tasks", "idx_tasks_company_id");
    expect(exists).toBe(true);
  });

  it("has index on tasks(site_id)", async () => {
    const exists = await indexExists("tasks", "idx_tasks_site_id");
    expect(exists).toBe(true);
  });

  it("has index on tasks(created_at)", async () => {
    const exists = await indexExists("tasks", "idx_tasks_created_at");
    expect(exists).toBe(true);
  });

  it("has index on deliveries(company_id)", async () => {
    const exists = await indexExists("deliveries", "idx_deliveries_company_id");
    expect(exists).toBe(true);
  });

  it("has index on assets(company_id)", async () => {
    const exists = await indexExists("assets", "idx_assets_company_id");
    expect(exists).toBe(true);
  });

  it("tasks list query uses indexes (no seq scan on large tables)", async () => {
    const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!conn) {
      console.warn("DATABASE_URL not set, skipping EXPLAIN");
      return;
    }
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: conn });
    await client.connect();
    try {
      const res = await client.query(
        `EXPLAIN (ANALYZE, COSTS, FORMAT TEXT) SELECT * FROM tasks WHERE company_id IS NOT NULL ORDER BY created_at DESC LIMIT 50`
      );
      const plan = (res.rows as { "QUERY PLAN": string }[]).map((r) => r["QUERY PLAN"]).join("\n");
      expect(hasSequentialScan(plan)).toBe(false);
    } finally {
      await client.end();
    }
  }, 15000);

  it("deliveries list query uses indexes", async () => {
    const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!conn) return;
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: conn });
    await client.connect();
    try {
      const res = await client.query(
        `EXPLAIN (ANALYZE, COSTS, FORMAT TEXT) SELECT * FROM deliveries WHERE company_id IS NOT NULL ORDER BY created_at DESC LIMIT 50`
      );
      const plan = (res.rows as { "QUERY PLAN": string }[]).map((r) => r["QUERY PLAN"]).join("\n");
      expect(hasSequentialScan(plan)).toBe(false);
    } finally {
      await client.end();
    }
  }, 15000);

  it("assets list query uses indexes", async () => {
    const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!conn) return;
    const pg = await import("pg");
    const client = new pg.default.Client({ connectionString: conn });
    await client.connect();
    try {
      const res = await client.query(
        `EXPLAIN (ANALYZE, COSTS, FORMAT TEXT) SELECT * FROM assets WHERE company_id IS NOT NULL ORDER BY created_at DESC LIMIT 50`
      );
      const plan = (res.rows as { "QUERY PLAN": string }[]).map((r) => r["QUERY PLAN"]).join("\n");
      expect(hasSequentialScan(plan)).toBe(false);
    } finally {
      await client.end();
    }
  }, 15000);
});
