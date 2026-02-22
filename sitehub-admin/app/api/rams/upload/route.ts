import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/auditLog";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const siteId = form.get("siteId") as string;
  const uploadedBy = form.get("uploadedBy") as string;

  const cookieStore = await cookies();
  let companyId = cookieStore.get("companyId")?.value ?? null;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role: cookieStore.get("role")?.value,
      })) || null;
  }
  const email = cookieStore.get("user_email")?.value;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = `rams/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseAdmin.storage.from("rams").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) {
    console.error("rams upload error:", uploadError);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from("rams").getPublicUrl(path);
  const fileUrl = urlData.publicUrl;

  const { data: inserted, error } = await supabaseAdmin
    .from("rams")
    .insert({
      title: file.name,
      site_id: siteId,
      url: fileUrl,
      company_id: companyId ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: users } = email ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1) : { data: [] };
  const actorId = users?.[0]?.id ?? "unknown";
  await writeAuditLog({
    userId: actorId,
    action: "rams_upload",
    timestamp: new Date(),
    actorId,
    actorEmail: email ?? null,
    metadata: { ramsId: inserted?.id, siteId, fileName: file.name },
  });

  return NextResponse.json({ success: true });
}
