import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureTaskAccess(id: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  if (role === "superuser") return null;
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await supabaseAdmin.from("tasks").select("company_id").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const taskCompanyId = (data as { company_id?: string }).company_id ?? "";
  if (taskCompanyId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const forbid = await ensureTaskAccess(taskId);
  if (forbid) return forbid;

  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  const bucket = "uploads";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `tasks/${taskId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || undefined, upsert: true });

  if (uploadError) {
    console.error("Task attachment upload failed:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  const fileUrl = urlData.publicUrl;

  const { data: attachment, error: insertError } = await supabaseAdmin
    .from("task_attachments")
    .insert({
      task_id: taskId,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type || ext,
    })
    .select("id, file_url, file_name, file_type, created_at")
    .single();

  if (insertError) {
    console.error("Task attachment insert failed:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ attachment });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const forbid = await ensureTaskAccess(taskId);
  if (forbid) return forbid;

  const { data, error } = await supabaseAdmin
    .from("task_attachments")
    .select("id, file_url, file_name, file_type, created_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
