#!/usr/bin/env node
/**
 * Live Schema Drift Audit
 * Compares live Supabase schema to migration-defined schema.
 * Requires: DATABASE_URL or SUPABASE_DB_URL (or pass --schema-file path to JSON from extract-live-schema.sql)
 *
 * Usage:
 *   DATABASE_URL=... node scripts/drift-audit.mjs
 *   node scripts/drift-audit.mjs --schema-file live_schema.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load env - prefer sitehub-admin (has DATABASE_URL), then cwd
try {
  const { config } = await import("dotenv");
  const sitehubAdmin = join(ROOT, "sitehub-admin");
  const paths = [
    join(sitehubAdmin, ".env.local"),
    join(sitehubAdmin, ".env"),
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".env"),
    join(ROOT, ".env"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      config({ path: p, override: false });
    }
  }
} catch {}

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function fetchLiveSchema() {
  const schemaFile = process.argv.filter((a) => a.startsWith("--schema-file=")).pop()?.split("=")[1];
  if (schemaFile && existsSync(schemaFile)) {
    const raw = readFileSync(schemaFile, "utf-8");
    let parsed = JSON.parse(raw);
    // Unwrap extract-live-schema.sql result: [{ schema_json: { tables:... } }]
    if (Array.isArray(parsed) && parsed[0]?.schema_json) parsed = parsed[0].schema_json;
    // Unwrap [[{...}]] or [{tables:...}] but not array of column rows [{table_name,...},...]
    else if (Array.isArray(parsed) && parsed[0] && parsed[0].tables && !parsed[0].table_name) parsed = parsed[0];
    if (parsed.schema_json) parsed = parsed.schema_json;
    if (parsed.tables && !Array.isArray(parsed)) return parsed;
    // Support supabase-schema.json format: array of { table_name, column_name, data_type, is_nullable }
    if (Array.isArray(parsed) && parsed[0]?.table_name) {
      const tables = {};
      for (const row of parsed) {
        if (!tables[row.table_name]) tables[row.table_name] = { columns: {}, rls_enabled: false, policies: [] };
        tables[row.table_name].columns[row.column_name] = { data_type: row.data_type, udt_name: row.data_type, is_nullable: row.is_nullable === "YES" };
      }
      return { tables, indexes: [], policies: [], rls: {} };
    }
    throw new Error("Schema file must have { tables: { ... } } or array of { table_name, column_name, data_type }. Use extract-live-schema.sql or scripts/supabase-schema.json.");
  }

  if (!dbUrl) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_URL (Supabase Dashboard → Project Settings → Database → Connection string),\n" +
        "  or pass --schema-file=path/to/live_schema.json\n" +
        "  To create schema file: Run scripts/extract-live-schema.sql in Supabase SQL Editor, copy result, save as JSON."
    );
  }

  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: dbUrl });
  await client.connect();

  const [tablesRes, indexesRes, policiesRes, rlsRes] = await Promise.all([
    client.query(`
      SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `),
    client.query(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`),
    client.query(`SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'`),
    client.query(`
      SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `),
  ]);

  const tablesQ = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tableNames = tablesQ.rows.map((r) => r.table_name);

  const live = {
    tables: {},
    indexes: indexesRes.rows,
    policies: policiesRes.rows,
    rls: Object.fromEntries(rlsRes.rows.map((r) => [r.table_name, r.rls_enabled])),
  };

  for (const t of tableNames) {
    live.tables[t] = {
      columns: {},
      rls_enabled: live.rls[t] ?? false,
      policies: policiesRes.rows.filter((p) => p.tablename === t).map((p) => ({ name: p.policyname, cmd: p.cmd })),
    };
  }

  for (const r of tablesRes.rows) {
    if (!live.tables[r.table_name]) continue;
    live.tables[r.table_name].columns[r.column_name] = {
      data_type: r.data_type,
      udt_name: r.udt_name,
      is_nullable: r.is_nullable === "YES",
      column_default: r.column_default,
    };
  }

  await client.end();
  return live;
}

function parseMigrations(migrationsDir) {
  if (!existsSync(migrationsDir)) return { tables: {}, indexes: [], policies: [] };
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const tables = {};
  const indexes = [];
  const policies = [];

  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), "utf-8");

    // CREATE TABLE IF NOT EXISTS table_name (...)
    const tableMatches = sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\)\s*(?:;|$)/gi);
    for (const m of tableMatches) {
      const tableName = m[1];
      const body = m[2];
      if (!tables[tableName]) tables[tableName] = { columns: {} };

      const colRegex = /^\s*(\w+)\s+(UUID|TEXT|JSONB|TIMESTAMPTZ|TIMESTAMP|BOOLEAN|BOOL|INTEGER|INT|BIGINT|NUMERIC|REAL|SERIAL|DOUBLE\s+PRECISION|CHARACTER\s+VARYING)/gim;
      let colMatch;
      while ((colMatch = colRegex.exec(body)) !== null) {
        const colName = colMatch[1];
        const typeStr = colMatch[2].toUpperCase().replace(/\s+/g, " ");
        let pgType = "text";
        if (typeStr.includes("UUID")) pgType = "uuid";
        else if (typeStr.includes("TEXT") || typeStr.includes("VARYING")) pgType = "text";
        else if (typeStr.includes("JSONB")) pgType = "jsonb";
        else if (typeStr.includes("TIMESTAMPTZ") || typeStr.includes("TIMESTAMP")) pgType = "timestamp with time zone";
        else if (typeStr.includes("BOOLEAN") || typeStr.includes("BOOL")) pgType = "boolean";
        else if (typeStr.includes("INTEGER") || typeStr.includes("INT") || typeStr.includes("SERIAL")) pgType = "integer";
        else if (typeStr.includes("BIGINT")) pgType = "bigint";
        else if (typeStr.includes("NUMERIC")) pgType = "numeric";
        else if (typeStr.includes("REAL") || typeStr.includes("DOUBLE")) pgType = "double precision";
        if (!["UNIQUE", "PRIMARY", "FOREIGN", "CHECK", "CONSTRAINT"].includes(colName.toUpperCase())) {
          tables[tableName].columns[colName] = pgType;
        }
      }
    }

    // CREATE INDEX
    const idxMatches = sql.matchAll(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi);
    for (const m of idxMatches) indexes.push({ name: m[1], table: m[2], columns: m[3] });

    // CREATE POLICY
    const polMatches = sql.matchAll(/CREATE\s+POLICY\s+"?(\w+)"?\s+ON\s+(\w+)\s+FOR\s+(\w+)/gi);
    for (const m of polMatches) policies.push({ name: m[1], table: m[2], cmd: m[3] });
  }

  return { tables, indexes, policies };
}

function normalizeType(t) {
  const u = (t || "").toLowerCase();
  if (u === "uuid") return "uuid";
  if (u === "text" || u === "character varying" || u === "varchar") return "text";
  if (u === "timestamp with time zone" || u === "timestamptz") return "timestamptz";
  if (u === "boolean" || u === "bool") return "boolean";
  if (u === "integer" || u === "int4") return "integer";
  if (u === "bigint" || u === "int8") return "bigint";
  if (u === "numeric") return "numeric";
  if (u === "double precision" || u === "float8") return "double precision";
  if (u === "jsonb") return "jsonb";
  if (u === "serial" || u === "serial4") return "integer";
  return u;
}

function compareSchema(live, expected, migrationsDir) {
  const drift = {
    tablesInLiveNotInMigrations: [],
    tablesInMigrationsNotInLive: [],
    missingColumns: [],
    extraColumns: [],
    typeMismatches: [],
    missingIndexes: [],
    missingPolicies: [],
    rlsEnabledNoPolicies: [],
    rlsDisabledShouldBeProtected: [],
  };

  const liveTables = new Set(Object.keys(live.tables));
  const expTables = new Set(Object.keys(expected.tables));

  for (const t of liveTables) {
    if (!expTables.has(t)) drift.tablesInLiveNotInMigrations.push(t);
  }
  for (const t of expTables) {
    if (!liveTables.has(t)) drift.tablesInMigrationsNotInLive.push(t);
  }

  for (const t of expTables) {
    if (!liveTables.has(t)) continue;
    const expCols = expected.tables[t]?.columns || {};
    const liveCols = live.tables[t]?.columns || {};
    const expColNames = new Set(Object.keys(expCols));
    const liveColNames = new Set(Object.keys(liveCols));

    for (const c of expColNames) {
      if (!liveColNames.has(c)) drift.missingColumns.push({ table: t, column: c, expectedType: expCols[c] });
      else {
        const liveType = normalizeType(liveCols[c]?.udt_name || liveCols[c]?.data_type);
        const expType = normalizeType(expCols[c]);
        if (expType !== liveType && expType !== "text" && liveType !== "text") {
          drift.typeMismatches.push({ table: t, column: c, live: liveType, expected: expType });
        }
      }
    }
    for (const c of liveColNames) {
      if (!expColNames.has(c)) drift.extraColumns.push({ table: t, column: c });
    }
  }

  const liveIndexNames = new Set(live.indexes.map((i) => `${i.tablename}:${i.indexname}`));
  for (const idx of expected.indexes) {
    const hasMatch = live.indexes.some((li) => li.tablename === idx.table && (li.indexname === idx.name || (idx.columns && li.indexdef?.includes(idx.columns))));
    if (!hasMatch) drift.missingIndexes.push(idx);
  }

  const livePolKeys = new Set(live.policies.map((p) => `${p.tablename}:${p.policyname}`));
  for (const pol of expected.policies) {
    const key = `${pol.table}:${pol.name}`;
    if (!livePolKeys.has(key)) drift.missingPolicies.push(pol);
  }

  for (const t of liveTables) {
    const rls = live.rls[t];
    const pols = live.tables[t]?.policies || [];
    if (rls && pols.length === 0 && expected.tables[t]) drift.rlsEnabledNoPolicies.push(t);
  }

  return drift;
}

function generateFixMigration(drift, liveTableNames) {
  const lines = [
    "-- Schema drift fixes - auto-generated",
    "-- Only adds columns/indexes for tables that exist in live DB",
    "",
  ];

  const liveTables = new Set(liveTableNames || []);

  for (const { table, column, expectedType } of drift.missingColumns) {
    if (!liveTables.size || liveTables.has(table)) {
      const pgType = expectedType === "uuid" ? "UUID" : expectedType === "timestamp with time zone" || expectedType === "timestamptz" ? "TIMESTAMPTZ" : expectedType === "jsonb" ? "JSONB" : "TEXT";
      lines.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${pgType};`);
    }
  }

  for (const idx of drift.missingIndexes) {
    if (!liveTables.size || liveTables.has(idx.table)) {
      const cols = idx.columns || (idx.def || "").replace(/.*\(/, "").replace(/\)$/, "") || "id";
      lines.push(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table} (${cols});`);
    }
  }

  for (const pol of drift.missingPolicies) {
    if (!liveTables.size || liveTables.has(pol.table)) {
      lines.push(`-- Policy ${pol.name} on ${pol.table} (add manually if needed)`);
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log("SiteHub Schema Drift Audit\n");

  let live;
  try {
    live = await fetchLiveSchema();
    console.log("  [OK] Fetched live schema:", Object.keys(live.tables || live).length, "tables");
  } catch (e) {
    console.error("  [FAIL]", e.message);
    process.exit(1);
  }

  const migrationsDir = join(ROOT, "supabase", "migrations");
  const sitehubAdminDir = join(ROOT, "sitehub-admin", "supabase", "migrations");
  const expected = parseMigrations(migrationsDir);

  const sitehubExpected = parseMigrations(sitehubAdminDir);
  for (const [t, def] of Object.entries(sitehubExpected.tables)) {
    if (!expected.tables[t]) expected.tables[t] = { columns: {} };
    for (const [c, typ] of Object.entries(def.columns)) {
      if (!expected.tables[t].columns[c]) expected.tables[t].columns[c] = typ;
    }
  }
  for (const idx of sitehubExpected.indexes) {
    if (!expected.indexes.some((i) => i.name === idx.name && i.table === idx.table)) expected.indexes.push(idx);
  }
  for (const pol of sitehubExpected.policies) {
    if (!expected.policies.some((p) => p.name === pol.name && p.table === pol.table)) expected.policies.push(pol);
  }

  const drift = compareSchema(live, expected, migrationsDir);

  const liveTableNames = Object.keys(live.tables || live);

  const report = {
    drift,
    summary: {
      tablesInLiveNotInMigrations: drift.tablesInLiveNotInMigrations.length,
      tablesInMigrationsNotInLive: drift.tablesInMigrationsNotInLive.length,
      missingColumns: drift.missingColumns.length,
      extraColumns: drift.extraColumns.length,
      typeMismatches: drift.typeMismatches.length,
      missingIndexes: drift.missingIndexes.length,
      missingPolicies: drift.missingPolicies.length,
      rlsEnabledNoPolicies: drift.rlsEnabledNoPolicies.length,
    },
  };

  const reportPath = join(ROOT, "SCHEMA_DRIFT_REPORT.md");
  const reportMd = [
    "# Schema Drift Report",
    `Generated: ${new Date().toISOString()}`,
    "",
    liveTableNames.length <= 6 ? "**Note:** Schema source has limited tables. For full audit, set DATABASE_URL or export fresh schema from Supabase SQL Editor.\n" : "",
    "## Summary",
    "",
    "| Category | Count |",
    "|----------|-------|",
    `| Tables in live DB not in migrations | ${report.summary.tablesInLiveNotInMigrations} |`,
    `| Tables in migrations not in live DB | ${report.summary.tablesInMigrationsNotInLive} |`,
    `| Missing columns | ${report.summary.missingColumns} |`,
    `| Extra columns (in live, not migrations) | ${report.summary.extraColumns} |`,
    `| Type mismatches | ${report.summary.typeMismatches} |`,
    `| Missing indexes | ${report.summary.missingIndexes} |`,
    `| Missing RLS policies | ${report.summary.missingPolicies} |`,
    `| Tables with RLS enabled but no policies | ${report.summary.rlsEnabledNoPolicies} |`,
    "",
    "## Details",
    "",
  ];

  if (drift.tablesInLiveNotInMigrations.length) {
    reportMd.push("### Tables in live DB but not in migrations\n\n");
    reportMd.push(drift.tablesInLiveNotInMigrations.map((t) => `- ${t}`).join("\n") + "\n\n");
  }
  if (drift.tablesInMigrationsNotInLive.length) {
    reportMd.push("### Tables in migrations but missing in live DB\n\n");
    reportMd.push(drift.tablesInMigrationsNotInLive.map((t) => `- ${t}`).join("\n") + "\n\n");
  }
  if (drift.missingColumns.length) {
    reportMd.push("### Missing columns (in migrations, not in live)\n\n");
    reportMd.push(drift.missingColumns.map((c) => `- ${c.table}.${c.column} (expected ${c.expectedType})`).join("\n") + "\n\n");
  }
  if (drift.typeMismatches.length) {
    reportMd.push("### Type mismatches\n\n");
    reportMd.push(drift.typeMismatches.map((m) => `- ${m.table}.${m.column}: live=${m.live}, expected=${m.expected}`).join("\n") + "\n\n");
  }
  if (drift.missingIndexes.length) {
    reportMd.push("### Missing indexes\n\n");
    reportMd.push(drift.missingIndexes.map((i) => `- ${i.table}.${i.name}`).join("\n") + "\n\n");
  }
  if (drift.missingPolicies.length) {
    reportMd.push("### Missing RLS policies\n\n");
    reportMd.push(drift.missingPolicies.map((p) => `- ${p.table}: ${p.name} (${p.cmd})`).join("\n") + "\n\n");
  }
  if (drift.rlsEnabledNoPolicies.length) {
    reportMd.push("### Tables with RLS enabled but no policies\n\n");
    reportMd.push(drift.rlsEnabledNoPolicies.map((t) => `- ${t}`).join("\n") + "\n\n");
  }

  writeFileSync(reportPath, reportMd.join("\n"));
  console.log("  [OK] Report written to SCHEMA_DRIFT_REPORT.md");

  const migrationSql = generateFixMigration(drift, liveTableNames);
  if (drift.missingColumns.length || drift.missingIndexes.length) {
    const existing = readdirSync(join(ROOT, "supabase", "migrations"))
      .filter((f) => f.endsWith("_schema_drift_fixes.sql"))
      .sort()
      .pop();
    const existingPath = existing ? join(ROOT, "supabase", "migrations", existing) : null;
    if (existingPath && readFileSync(existingPath, "utf-8") === migrationSql) {
      console.log("  [OK] No new fixes (same as", existing + ")");
    } else {
      const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const migrationPath = join(ROOT, "supabase", "migrations", `${ts}_schema_drift_fixes.sql`);
      writeFileSync(migrationPath, migrationSql);
      console.log("  [OK] Fix migration written to", migrationPath.replace(ROOT + "/", ""));
    }
  }

  const hasIssues =
    drift.tablesInMigrationsNotInLive.length +
    drift.missingColumns.length +
    drift.typeMismatches.length +
    drift.missingIndexes.length;
  if (liveTableNames.length <= 6) {
    console.log("\n  [INFO] Schema file may be stale (only", liveTableNames.length, "tables). For full audit, set DATABASE_URL and re-run, or export fresh schema from Supabase SQL Editor.");
  }
  if (hasIssues > 0) {
    console.log("\n  [WARN] Drift detected. Review SCHEMA_DRIFT_REPORT.md");
  } else {
    console.log("\n  [OK] No critical drift.");
  }
}

main();
