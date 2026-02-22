import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function parseCSV(text: string): { email: string; name: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const result: { email: string; name: string }[] = [];
  const headerRow = lines[0] ?? "";
  const headers = headerRow.split(",").map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  const emailIdx = headers.findIndex((h) => h === "email" || h === "e-mail");
  const nameIdx = headers.findIndex((h) => h === "name");
  const start = emailIdx >= 0 || nameIdx >= 0 ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
    const email = (emailIdx >= 0 ? parts[emailIdx] : parts[0]) ?? "";
    const name = (nameIdx >= 0 ? parts[nameIdx] : parts[1]) ?? "";
    const emailClean = email.trim().toLowerCase();
    if (emailClean && emailClean.includes("@")) {
      result.push({ email: emailClean, name: name.trim() || emailClean.split("@")[0] });
    }
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const companyId = (form.get("companyId") as string)?.trim();

    if (!file || !companyId) return NextResponse.json({ error: "file and companyId required" }, { status: 400 });

    const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", companyId).maybeSingle();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    const companyName = company.name ?? "Company";

    const text = await file.text();
    const rows = parseCSV(text).slice(0, 200);
    if (rows.length === 0) return NextResponse.json({ error: "No valid rows (need email column)" }, { status: 400 });

    const { data: admins } = await supabaseAdmin.from("users").select("id").eq("company_id", companyId).eq("role", "admin");
    const isFirstAdmin = !admins?.length;

    const { data: regs } = await supabaseAdmin.from("registrations").select("data").eq("company_id", companyId);
    const { data: users } = await supabaseAdmin.from("users").select("email").eq("company_id", companyId);
    const existingEmails = new Set<string>();
    (regs ?? []).forEach((r) => {
      const e = (r.data as { email?: string })?.email?.toLowerCase();
      if (e) existingEmails.add(e);
    });
    (users ?? []).forEach((u) => {
      const e = u.email?.toLowerCase();
      if (e) existingEmails.add(e);
    });

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      if (existingEmails.has(row.email)) {
        skipped++;
        continue;
      }
      const regStatus = isFirstAdmin && created === 0 ? "COMPANY_ADMIN_PENDING" : "PENDING";
      const regRole = isFirstAdmin && created === 0 ? "ADMIN" : "OPERATIVE";
      await supabaseAdmin.from("registrations").insert({
        company_id: companyId,
        data: { email: row.email, name: row.name, companyName, status: regStatus, role: regRole },
      });
      existingEmails.add(row.email);
      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created} registration(s)${skipped ? `, skipped ${skipped} (already exist).` : "."}`,
      created,
      skipped,
    });
  } catch (e) {
    console.error("import-users-csv failed:", e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
