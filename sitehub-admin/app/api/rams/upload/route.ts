import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog, isUuidLike } from "@/lib/auditLog";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";
import { RAMS_MAX_UPLOAD_BYTES, RAMS_MAX_UPLOAD_LABEL } from "@/lib/ramsUploadLimits";

export const maxDuration = 120;

function sanitizeFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "-").trim() || "document.pdf";
  return base.slice(0, 200);
}

async function actorIdForAudit(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  email: string | undefined
): Promise<string> {
  const uid = cookieStore.get("uid")?.value?.trim();
  if (uid && isUuidLike(uid)) return uid;
  if (!email) return "unknown";
  const { data: users } = await supabaseAdmin.from("users").select("id").eq("email", email.trim()).limit(1);
  return users?.[0]?.id ?? "unknown";
}

export async function POST(req: Request) {
  const form = await req.formData();
  const fileEntry = form.get("file");
  const siteId = (form.get("siteId") as string) ?? "";
  const titleRaw = ((form.get("title") as string) ?? "").trim();
  const descriptionRaw = ((form.get("description") as string) ?? "").trim();

  if (
    !fileEntry ||
    typeof fileEntry === "string" ||
    !(fileEntry instanceof Blob) ||
    fileEntry.size === 0
  ) {
    return NextResponse.json({ error: "A non-empty PDF file is required" }, { status: 400 });
  }

  const file = fileEntry as File;
  if (file.size > RAMS_MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${RAMS_MAX_UPLOAD_LABEL})` },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value ?? null;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || null;
  }
  if (role === "superuser") {
    const fromForm = ((form.get("companyId") as string) ?? "").trim();
    if (fromForm) companyId = fromForm;
  }

  if (!companyId?.trim()) {
    return NextResponse.json(
      {
        error:
          "Company context missing. Sign in again or use “Impersonate company” before uploading RAMS.",
      },
      { status: 400 }
    );
  }

  const email = cookieStore.get("user_email")?.value;
  const companyIdTrim = companyId.trim();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const sid = siteId.toString().trim();
  const safeName = sanitizeFileName(file.name || "rams.pdf");
  const path = sid ? `rams/${sid}/${Date.now()}-${safeName}` : `rams/${Date.now()}-${safeName}`;

  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : "application/pdf";

  const { error: uploadError } = await supabaseAdmin.storage.from("rams").upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (uploadError) {
    console.error("rams upload error:", uploadError);
    const aid = await actorIdForAudit(cookieStore, email);
    await writeAuditLog({
      userId: aid,
      action: "rams_upload_failed",
      timestamp: new Date(),
      actorId: aid,
      actorEmail: email ?? null,
      metadata: {
        stage: "storage",
        error: uploadError.message,
        siteId: sid || null,
        fileName: file.name,
        companyId: companyIdTrim,
      },
    });
    return NextResponse.json(
      { error: uploadError.message || "Storage upload failed" },
      { status: 500 }
    );
  }

  const { data: urlData } = supabaseAdmin.storage.from("rams").getPublicUrl(path);
  const fileUrl = urlData.publicUrl;

  const displayTitle = titleRaw || safeName.replace(/\.pdf$/i, "") || safeName;

  const row: Record<string, unknown> = {
    id: randomUUID(),
    title: displayTitle,
    description: descriptionRaw || null,
    site_id: sid || null,
    url: fileUrl,
    company_id: companyIdTrim,
    status: "PENDING",
  };

  let { data: inserted, error } = await supabaseAdmin
    .from("rams")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("description")) {
      const rowNoDesc = { ...row };
      delete rowNoDesc.description;
      const retry = await supabaseAdmin
        .from("rams")
        .insert(rowNoDesc)
        .select("id")
        .single();
      inserted = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    console.error("rams DB insert error:", error);
    try {
      await supabaseAdmin.storage.from("rams").remove([path]);
    } catch {
      /* best-effort cleanup */
    }
    const aid = await actorIdForAudit(cookieStore, email);
    await writeAuditLog({
      userId: aid,
      action: "rams_upload_failed",
      timestamp: new Date(),
      actorId: aid,
      actorEmail: email ?? null,
      metadata: {
        stage: "database",
        error: error.message,
        siteId: sid || null,
        fileName: file.name,
        companyId: companyIdTrim,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const actorId = await actorIdForAudit(cookieStore, email);
  await writeAuditLog({
    userId: actorId,
    action: "rams_upload",
    timestamp: new Date(),
    actorId,
    actorEmail: email ?? null,
    metadata: { ramsId: inserted?.id, siteId, fileName: file.name, companyId: companyIdTrim },
  });

  const { data: companyUsers } = await supabaseAdmin.from("users").select("id").eq("company_id", companyIdTrim);
  const pushIds = (companyUsers ?? []).map((r) => r.id).filter(Boolean) as string[];
  if (pushIds.length > 0) {
    sendPushToUsers(
      pushIds,
      `New RAMS: ${displayTitle}`,
      "A new risk assessment & method statement was added",
      { type: "rams", screen: "rams" }
    ).catch((e) => console.error("RAMS push failed:", e));
  }

  return NextResponse.json({ success: true });
}
