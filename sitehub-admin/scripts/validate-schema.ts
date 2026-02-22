#!/usr/bin/env npx tsx
/**
 * Migration Validator
 * Loads Supabase introspection and Zod schemas; compares column names, types, nullability.
 * Fails on mismatch.
 *
 * Usage: npm run validate:schema
 * Env: DATABASE_URL for live introspection, else uses scripts/supabase-schema.json
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { z } from "zod";
import "dotenv/config";

interface DbColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
}

function pgTypeToZod(pgType: string): string {
  const m: Record<string, string> = {
    text: "string",
    "character varying": "string",
    varchar: "string",
    char: "string",
    uuid: "string",
    boolean: "boolean",
    bool: "boolean",
    "smallint": "number",
    integer: "number",
    "bigint": "number",
    numeric: "number",
    real: "number",
    "double precision": "number",
    "timestamp with time zone": "string",
    "timestamp without time zone": "string",
    timestamptz: "string",
    timestamp: "string",
    date: "string",
    jsonb: "object",
    json: "object",
  };
  return m[pgType] ?? "unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getZodFieldInfo(schema: any): { type: string; nullable: boolean } {
  let s: z.ZodTypeAny = schema;
  let nullable = false;
  const getDef = (x: z.ZodTypeAny) =>
    (x as { def?: { type?: string; innerType?: z.ZodTypeAny }; _def?: { typeName?: string; innerType?: z.ZodTypeAny } }).def ??
    (x as { _def?: { typeName?: string; innerType?: z.ZodTypeAny } })._def;

  while (s) {
    const def = getDef(s);
    if (!def) break;
    const t = (def as { type?: string }).type ?? (def as { typeName?: string }).typeName ?? "";
    const inner = (def as { innerType?: z.ZodTypeAny }).innerType ?? (def as { inner?: z.ZodTypeAny }).inner;
    if (t === "optional" || t === "ZodOptional" || t === "default" || t === "ZodDefault") {
      nullable = true;
      s = inner ?? s;
      continue;
    }
    if (t === "nullable" || t === "ZodNullable") {
      nullable = true;
      s = inner ?? s;
      continue;
    }
    break;
  }

  const def = getDef(s);
  const t = (def as { type?: string }).type ?? (def as { typeName?: string }).typeName ?? "unknown";
  let type = "unknown";
  if (t === "string" || t === "ZodString") type = "string";
  else if (t === "number" || t === "ZodNumber") type = "number";
  else if (t === "boolean" || t === "ZodBoolean") type = "boolean";
  else if (t === "date" || t === "ZodDate") type = "string";
  else if (t === "record" || t === "ZodRecord" || t === "object" || t === "ZodObject") type = "object";
  else if (t === "unknown" || t === "ZodUnknown" || t === "any" || t === "ZodAny") type = "object";
  else if (t === "ZodEffects" || t === "effects") {
    const inner = (def as { innerType?: z.ZodTypeAny }).innerType ?? (def as { schema?: z.ZodTypeAny }).schema;
    if (inner) {
      const innerDef = getDef(inner);
      const innerT = (innerDef as { type?: string }).type ?? (innerDef as { typeName?: string }).typeName ?? "";
      if (innerT === "string" || innerT === "ZodString") type = "string";
      else if (innerT === "number" || innerT === "ZodNumber") type = "number";
      else type = "string";
    }
  } else type = "string";

  return { type, nullable };
}

async function loadDbSchema(): Promise<DbColumn[]> {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    try {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: dbUrl });
      await client.connect();
      const res = await client.query<DbColumn>(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);
      await client.end();
      return res.rows;
    } catch (e) {
      console.warn("  [DB] Live introspection failed:", (e as Error).message);
      console.warn("  [DB] Falling back to scripts/supabase-schema.json");
    }
  }

  const cachePath = join(process.cwd(), "scripts", "supabase-schema.json");
  if (!existsSync(cachePath)) {
    throw new Error(
      "No schema source. Set DATABASE_URL for live introspection or ensure scripts/supabase-schema.json exists (run Supabase SQL and export)."
    );
  }
  const raw = readFileSync(cachePath, "utf-8");
  return JSON.parse(raw) as DbColumn[];
}

async function loadZodSchemas(): Promise<Record<string, z.ZodObject<z.ZodRawShape>>> {
  const indexPath = join(process.cwd(), "lib", "schemas", "index.ts");
  if (!existsSync(indexPath)) {
    throw new Error("lib/schemas/index.ts not found. Define TABLE_SCHEMAS there.");
  }
  const mod = await import("../lib/schemas/index");
  if (!mod.TABLE_SCHEMAS) {
    throw new Error("lib/schemas/index.ts must export TABLE_SCHEMAS");
  }
  return mod.TABLE_SCHEMAS as Record<string, z.ZodObject<z.ZodRawShape>>;
}

function compare(
  tableName: string,
  dbCols: DbColumn[],
  zodSchema: z.ZodObject<z.ZodRawShape>
): string[] {
  const errors: string[] = [];
  const shape = zodSchema.shape;
  const dbColMap = new Map(dbCols.map((c) => [c.column_name, c]));

  for (const col of dbCols) {
    const key = col.column_name as keyof typeof shape;
    const zodField = shape[key];
    if (!zodField) {
      errors.push(`${tableName}.${col.column_name}: missing in Zod schema`);
      continue;
    }
    const { type: zodType, nullable: zodNullable } = getZodFieldInfo(zodField as z.ZodTypeAny);
    const expectedPg = pgTypeToZod(col.data_type);
    const dbNullable = col.is_nullable === "YES";

    if (zodType !== "unknown" && expectedPg !== "unknown" && zodType !== expectedPg) {
      errors.push(
        `${tableName}.${col.column_name}: type mismatch (DB ${col.data_type} -> ${expectedPg}, Zod ${zodType})`
      );
    }
    if (!dbNullable && zodNullable) {
      errors.push(
        `${tableName}.${col.column_name}: nullability mismatch (DB NOT NULL, Zod optional/nullable)`
      );
    }
    if (dbNullable && !zodNullable) {
      errors.push(
        `${tableName}.${col.column_name}: nullability mismatch (DB nullable, Zod required)`
      );
    }
  }

  for (const key of Object.keys(shape)) {
    if (!dbColMap.has(key)) {
      errors.push(`${tableName}.${key}: in Zod schema but not in DB`);
    }
  }

  return errors;
}

async function main(): Promise<void> {
  console.log("Migration Validator\n");

  let dbCols: DbColumn[];
  try {
    dbCols = await loadDbSchema();
    console.log(`  [OK] Loaded DB schema (${dbCols.length} columns)`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  let zodSchemas: Record<string, z.ZodObject<z.ZodRawShape>>;
  try {
    zodSchemas = await loadZodSchemas();
    console.log(`  [OK] Loaded Zod schemas (${Object.keys(zodSchemas).length} tables)`);
  } catch (e) {
    console.error("  [FAIL] Could not load Zod schemas:", (e as Error).message);
    process.exit(1);
  }

  const allErrors: string[] = [];
  const dbTables = [...new Set(dbCols.map((c) => c.table_name))];

  for (const tableName of Object.keys(zodSchemas)) {
    const tableCols = dbCols.filter((c) => c.table_name === tableName);
    if (tableCols.length === 0) {
      allErrors.push(`${tableName}: Zod schema exists but table not in DB`);
      continue;
    }
    const errs = compare(tableName, tableCols, zodSchemas[tableName]);
    allErrors.push(...errs);
  }

  const tablesWithoutZod = dbTables.filter((t) => !(t in zodSchemas));
  if (tablesWithoutZod.length > 0) {
    console.log(`  [INFO] Tables without Zod schema (skipped): ${tablesWithoutZod.join(", ")}`);
  }

  if (allErrors.length > 0) {
    console.error("\nFAIL: Schema mismatches:\n");
    allErrors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }

  console.log("\nPASS: All Zod schemas match DB introspection.\n");
}

main();
