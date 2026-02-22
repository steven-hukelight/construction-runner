import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/auditLog";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const title = (form.get("title") as string) || (file?.name ?? "Untitled");
  const siteId = (form.get("siteId") as string) || "";

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

  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  const path = `briefings/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("briefings")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Briefing upload failed:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from("briefings").getPublicUrl(uploadData.path);
  const fileUrl = urlData.publicUrl;

  const { data: briefing, error: insertError } = await supabaseAdmin.from("briefings").insert({
    title: title.trim() || file.name,
    file_url: fileUrl,
    company_id: companyId,
    site_id: siteId.trim() || null,
    uploaded_by: "admin",
  }).select("id").single();

  if (insertError) {
    console.error("Briefing insert failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: users } = email ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1) : { data: [] };
  const actorId = users?.[0]?.id ?? "unknown";
  await writeAuditLog({
    userId: actorId,
    action: "briefing_upload",
    timestamp: new Date(),
    actorId,
    actorEmail: email ?? null,
    metadata: { briefingId: briefing?.id, title: title || file.name },
  });

  return NextResponse.json({ success: true });
}
