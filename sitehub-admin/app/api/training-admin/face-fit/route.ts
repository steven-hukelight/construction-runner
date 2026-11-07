import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { FACE_FIT_BUCKET, type FaceFitRow } from "@/lib/training/service";

export const dynamic = "force-dynamic";

const CERTIFICATE_MAX_BYTES = 4 * 1024 * 1024;
const CERTIFICATE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"]);

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function field(form: FormData, name: string, max = 120): string {
  return String(form.get(name) ?? "").trim().slice(0, max);
}

/** Every face fit test logged for the company, newest first. */
export async function GET(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { data, error } = await supabaseAdmin
    .from("face_fit_tests")
    .select("*")
    .eq("company_id", auth.companyId)
    .order("tested_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("GET /api/training-admin/face-fit:", error);
    return NextResponse.json({ error: "Couldn't load face fit records" }, { status: 500 });
  }
  const rows = (data ?? []) as FaceFitRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: users } = userIds.length
    ? await supabaseAdmin.from("users").select("id, name, email").in("id", userIds)
    : { data: [] };
  const names = new Map((users ?? []).map((u) => [String(u.id), String(u.name ?? "").trim() || String(u.email ?? "")]));
  return NextResponse.json({
    records: rows.map((r) => ({ ...r, person_name: names.get(r.user_id) ?? "Unknown", has_certificate: Boolean(r.certificate_path) })),
  });
}

/** Multipart form: userId, testedAt, reviewDueAt, result, method, maskMake, maskModel, maskSize?, testerName, notes?, certificate? */
export async function POST(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canRecord) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const form = await req.formData();
    const userId = field(form, "userId", 64);
    const testedAt = field(form, "testedAt", 10);
    const reviewDueAt = field(form, "reviewDueAt", 10);
    const result = field(form, "result", 10);
    const method = field(form, "method", 20);
    const maskMake = field(form, "maskMake");
    const maskModel = field(form, "maskModel");
    const maskSize = field(form, "maskSize", 40) || null;
    const testerName = field(form, "testerName");
    const notes = field(form, "notes", 1000) || null;

    if (!userId || !maskMake || !maskModel || !testerName) {
      return NextResponse.json({ error: "Person, mask make, mask model and tester are required" }, { status: 400 });
    }
    if (!isDateOnly(testedAt) || !isDateOnly(reviewDueAt)) {
      return NextResponse.json({ error: "Enter the test date and review date" }, { status: 400 });
    }
    if (reviewDueAt < testedAt) return NextResponse.json({ error: "The review date must be after the test date" }, { status: 400 });
    if (result !== "pass" && result !== "fail") return NextResponse.json({ error: "Result must be pass or fail" }, { status: 400 });
    if (method !== "qualitative" && method !== "quantitative") {
      return NextResponse.json({ error: "Method must be qualitative or quantitative" }, { status: 400 });
    }

    const { data: person } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
    if (!person || person.company_id !== auth.companyId) return NextResponse.json({ error: "Person not found" }, { status: 404 });

    let certificatePath: string | null = null;
    const file = form.get("certificate");
    if (file instanceof Blob && file.size > 0) {
      if (file.size > CERTIFICATE_MAX_BYTES) return NextResponse.json({ error: "Certificate must be under 4 MB" }, { status: 400 });
      if (!CERTIFICATE_TYPES.has(file.type)) return NextResponse.json({ error: "Certificate must be a PDF or photo" }, { status: 400 });
      const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
      certificatePath = `${auth.companyId}/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(FACE_FIT_BUCKET)
        .upload(certificatePath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        console.error("face fit certificate upload failed:", uploadError);
        return NextResponse.json({ error: "Couldn't upload the certificate" }, { status: 500 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("face_fit_tests")
      .insert({
        company_id: auth.companyId,
        user_id: userId,
        tested_at: testedAt,
        review_due_at: reviewDueAt,
        result,
        method,
        mask_make: maskMake,
        mask_model: maskModel,
        mask_size: maskSize,
        tester_name: testerName,
        certificate_path: certificatePath,
        notes,
        created_by: auth.uid,
      })
      .select("id")
      .single();
    if (error || !data) {
      if (certificatePath) await supabaseAdmin.storage.from(FACE_FIT_BUCKET).remove([certificatePath]);
      console.error("POST /api/training-admin/face-fit:", error);
      return NextResponse.json({ error: "Couldn't save the record" }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (e) {
    console.error("POST /api/training-admin/face-fit:", e);
    return NextResponse.json({ error: "Couldn't save the record" }, { status: 500 });
  }
}
