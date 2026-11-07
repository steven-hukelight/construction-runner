import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/auditLog";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";
import { assertWritableSiteId } from "@/lib/auth/siteScope";
import { canPublishSiteWide } from "@/lib/auth/roles";
import { userIdsForCompany, userIdsForSiteContent } from "@/lib/auth/siteAudience";
import { claimStagedUpload } from "@/lib/storage/stagedUpload";
import { isHttpsUrl } from "@/lib/utils/httpsUrl";

export async function POST(req: Request) {
  const form = await req.formData();
  const fileEntry = form.get("file");
  const file = fileEntry instanceof Blob && fileEntry.size > 0 ? (fileEntry as File) : null;
  const stagedToken = ((form.get("stagedToken") as string) ?? "").trim();
  const fileName = file?.name || ((form.get("fileName") as string) ?? "").trim() || "briefing";
  const title = (form.get("title") as string) || fileName;
  const body = (form.get("body") as string) || "";
  const siteId = (form.get("siteId") as string) || "";
  const videoUrl = ((form.get("videoUrl") as string) ?? "").trim();

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
  if (videoUrl && !isHttpsUrl(videoUrl)) {
    return NextResponse.json({ error: "The video link must start with https://" }, { status: 400 });
  }
  if (!file && !stagedToken && !videoUrl) return NextResponse.json({ error: "Add a PDF or a video link" }, { status: 400 });
  const siteForbid = await assertWritableSiteId(cookieStore.get("role")?.value, siteId);
  if (siteForbid) return siteForbid;

  const path = `briefings/${siteId.trim()}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const hasDocument = Boolean(file || stagedToken);
  if (file) {
    const { error: uploadError } = await supabaseAdmin.storage
      .from("briefings")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      console.error("Briefing upload failed:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  } else if (stagedToken) {
    const claimed = await claimStagedUpload("briefing", stagedToken, path);
    if ("error" in claimed) return NextResponse.json({ error: claimed.error }, { status: 400 });
  }

  const fileUrl = hasDocument ? supabaseAdmin.storage.from("briefings").getPublicUrl(path).data.publicUrl : null;

  const { data: users } = email ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1) : { data: [] };
  const actorId = (users?.[0] as { id?: string })?.id ?? null;

  const siteWide =
    String(form.get("siteWide") ?? "").toLowerCase() === "true" && canPublishSiteWide(cookieStore.get("role")?.value);
  const { data: briefing, error: insertError } = await supabaseAdmin.from("briefings").insert({
    title: title.trim() || fileName,
    body: body.trim() || null,
    file_url: fileUrl,
    video_url: videoUrl || null,
    company_id: companyId,
    site_id: siteId.trim(),
    uploaded_by: actorId,
    site_wide: siteWide,
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
    metadata: { briefingId: briefing?.id, title: title || fileName },
  });

  const userIds = siteWide
    ? await userIdsForCompany(companyId)
    : await userIdsForSiteContent(companyId, siteId.trim());
  let push: { recipients: number; sent: boolean; error?: string } = {
    recipients: userIds.length,
    sent: false,
  };
  if (userIds.length > 0) {
    try {
      // Await so Vercel does not freeze the function before OneSignal is called.
      const result = await sendPushToUsers(
        userIds,
        `New Briefing: ${title.trim() || fileName}`,
        "New toolbox talk / briefing added",
        {
          type: "briefing",
          screen: "briefings",
          ...(siteId.trim() ? { siteId: siteId.trim() } : {}),
        },
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
