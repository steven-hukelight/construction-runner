import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const form = await req.formData();
  const ruleId = form.get("ruleId") as string;
  const file = form.get("file") as File;

  if (!ruleId || !file) {
    return NextResponse.json({ error: "ruleId and file required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const companyId = cookieStore.get("companyId")?.value;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("site_rules")
    .select("id, company_id")
    .eq("id", ruleId)
    .single();

  if (!existing || (existing as { company_id?: string }).company_id !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bucket = "uploads";
  const path = `site-rules/${companyId}/${ruleId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || undefined, upsert: true });

  if (uploadError) {
    console.error("Site rule upload failed:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  const fileUrl = urlData.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from("site_rules")
    .update({ file_url: fileUrl, updated_at: new Date().toISOString() })
    .eq("id", ruleId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ file_url: fileUrl });
}
