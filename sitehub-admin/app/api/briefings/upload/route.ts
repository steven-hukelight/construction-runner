import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/auditLog";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";
import { assertWritableSiteId } from "@/lib/auth/siteScope";
import { userIdsForSiteContent } from "@/lib/auth/siteAudience";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File;
  const title = (form.get("title") as string) || (file?.name ?? "Untitled");
  const body = (form.get("body") as string) || "";
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
  const siteForbid = await assertWritableSiteId(cookieStore.get("role")?.value, siteId);
  if (siteForbid) return siteForbid;

  const path = `briefings/${siteId.trim()}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("briefings")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Briefing upload failed:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from("briefings").getPublicUrl(uploadData.path);
  const fileUrl = urlData.publicUrl;

  const { data: users } = email ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1) : { data: [] };
  const actorId = (users?.[0] as { id?: string })?.id ?? null;

  const { data: briefing, error: insertError } = await supabaseAdmin.from("briefings").insert({
    title: title.trim() || file.name,
    body: body.trim() || null,
    file_url: fileUrl,
    company_id: companyId,
    site_id: siteId.trim(),
    uploaded_by: actorId,
  }).select("id").single();

  if (insertError) {
    console.error("Briefing insert failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await writeAuditLog({
    userId: actorId ?? "unknown",
    action: "briefing_upload",
    timestamp: new Date(),
    actorId: actorId ?? "unknown",
    actorEmail: email ?? null,
    metadata: { briefingId: briefing?.id, title: title || file.name },
  });

  const userIds = await userIdsForSiteContent(companyId, siteId.trim());
  let push: { recipients: number; sent: boolean; error?: string } = {
    recipients: userIds.length,
    sent: false,
  };
  if (userIds.length > 0) {
    try {
      // Await so Vercel does not freeze the function before OneSignal is called.
      const result = await sendPushToUsers(
        userIds,
        `New Briefing: ${title.trim() || file.name}`,
        "New toolbox talk / briefing added",
        { type: "briefing", screen: "briefings" },
      );
      push = {
        recipients: userIds.length,
        sent: Boolean(result.sent),
        error: result.error,
      };
      if (!result.sent) {
        console.error("Briefing push failed:", result.error, { recipients: userIds.length });
      }
    } catch (e) {
      console.error("Briefing push failed:", e);
      push = {
        recipients: userIds.length,
        sent: false,
        error: e instanceof Error ? e.message : "push failed",
      };
    }
  } else {
    console.warn("Briefing upload: no push recipients for site", siteId.trim());
  }

  return NextResponse.json({ success: true, push });
}
