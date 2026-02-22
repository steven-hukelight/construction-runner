#!/usr/bin/env npx tsx
/**
 * UUID Consistency Checker
 * Scans cookies (code paths), localStorage, API routes, and DB rows.
 * Fails (exit 1) if any companyId is not a valid UUID.
 *
 * Usage: npm run check:uuids [-- --skip-api]
 *   --skip-api  Skip API route static check (raw cookie reads); use while migrating.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import "dotenv/config";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return Boolean(value && UUID_REGEX.test(String(value).trim()));
}

const errors: string[] = [];
const rootDir = process.cwd();
const appDir = join(rootDir, "app");
const libDir = join(rootDir, "lib");

function scanDir(dir: string, ext: string[] = [".ts", ".tsx"]): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...scanDir(full, ext));
    } else if (ext.some((e) => entry.name.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

// --- 1. COOKIES: ensure UUID validation before setting ---
function checkCookiePaths(): void {
  const cookieFile = join(libDir, "utils", "cookies.ts");
  if (!existsSync(cookieFile)) return;
  const content = readFileSync(cookieFile, "utf-8");
  if (!content.includes("isCompanyIdUuid") || !content.includes("UUID_REGEX")) {
    errors.push("[cookies] lib/utils/cookies.ts: must validate companyId with UUID regex before returning");
  }
  if (!content.includes("max-age=0") && !content.includes("maxAge: 0")) {
    errors.push("[cookies] lib/utils/cookies.ts: must clear invalid companyId cookie (max-age=0)");
  }

  const loginFile = join(appDir, "login", "actions.ts");
  if (existsSync(loginFile)) {
    const login = readFileSync(loginFile, "utf-8");
    const hasUuidCheck =
      (login.includes("0-9a-f") && login.includes("test(raw)")) ||
      login.includes("isCompanyIdUuid");
    if (!hasUuidCheck) {
      errors.push("[cookies] app/login/actions.ts: must validate company_id as UUID before setting cookie");
    }
  }

  const switcherFile = join(appDir, "dashboard", "components", "CompanySwitcher.tsx");
  if (existsSync(switcherFile)) {
    const switcher = readFileSync(switcherFile, "utf-8");
    if (switcher.includes("document.cookie") && switcher.includes("companyId") && !switcher.includes("isCompanyIdUuid")) {
      errors.push("[cookies] CompanySwitcher.tsx: must use isCompanyIdUuid() before writing companyId to cookie");
    }
  }
}

// --- 2. LOCALSTORAGE: no companyId in localStorage ---
function checkLocalStorage(): void {
  const files = scanDir(rootDir);
  for (const f of files) {
    if (f.includes("node_modules") || f.includes(".next")) continue;
    const content = readFileSync(f, "utf-8");
    const match = content.match(/localStorage\.(get|set)Item\s*\(\s*["']([^"']+)["']/g);
    if (match) {
      for (const m of match) {
        if (m.toLowerCase().includes("companyid") || m.toLowerCase().includes("company_id")) {
          errors.push(`[localStorage] ${f}: must not store companyId in localStorage`);
        }
      }
    }
  }
}

// --- 3. API: flag routes that read companyId from raw cookie (not getCompanyIdFromClient) ---
// Routes using params.companyId from URL or companyId from DB are OK; only raw cookie read is risky.
function checkApiResponses(): void {
  const apiDir = join(appDir, "api");
  if (!existsSync(apiDir)) return;
  const files = scanDir(apiDir);
  for (const f of files) {
    const content = readFileSync(f, "utf-8");
    const readsRawCookie =
      (content.includes("cookies()") || content.includes("cookieStore")) &&
      (content.includes('get("companyId")') || content.includes("get('companyId')"));
    if (readsRawCookie && !content.includes("getCompanyIdFromClient") && !content.includes("isCompanyIdUuid")) {
      errors.push(`[API] ${f}: reads companyId from raw cookie; use getCompanyIdFromClient or validate with isCompanyIdUuid`);
    }
  }
}

// --- 4. DB rows: query for non-UUID company_id ---
async function checkDbRows(): Promise<void> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("  [DB] Skipped (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)");
    return;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key);

    // Check companies.id (primary)
    const { data: companies } = await supabase.from("companies").select("id");
    for (const r of companies || []) {
      if (r?.id && !isUuid(r.id)) {
        errors.push(`[DB] companies.id non-UUID: "${r.id}"`);
      }
    }

    // Check company_id in all tables
    const tables = [
      "users",
      "sites",
      "tasks",
      "notices",
      "deliveries",
      "attendance",
      "rams",
      "registrations",
      "settings",
      "site_subcontractors",
    ];

    for (const table of tables) {
      const { data } = await supabase.from(table).select("company_id");
      for (const row of data || []) {
        const cid = (row as { company_id?: string | null })?.company_id;
        if (cid != null && cid !== "" && !isUuid(cid)) {
          errors.push(`[DB] ${table}.company_id non-UUID: "${cid}"`);
        }
      }
    }
  } catch (e) {
    errors.push(`[DB] Check failed: ${(e as Error).message}`);
  }
}

async function main(): Promise<void> {
  const skipApi = process.argv.includes("--skip-api");
  console.log("UUID Consistency Check\n");

  checkCookiePaths();
  console.log("  [OK] Cookie code paths");

  checkLocalStorage();
  console.log("  [OK] localStorage (no companyId)");

  if (!skipApi) {
    checkApiResponses();
    console.log("  [OK] API (no raw cookie companyId)");
  } else {
    console.log("  [SKIP] API check (--skip-api)");
  }

  await checkDbRows();
  console.log("  [OK] DB rows");

  if (errors.length > 0) {
    console.error("\nFAIL: Non-UUID companyId detected:\n");
    errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }

  console.log("\nPASS: All companyId values are UUID-valid.\n");
}

main();
