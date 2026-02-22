import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

const ALLOWED_TYPES = ["pod", "load"] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function ensureDeliveryAccess(deliveryId: string): Promise<{ companyId: string; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();

  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || "";
  }
  if (!companyId) return { companyId: "", error: NextResponse.json({ error: "Company required" }, { status: 400 }) };

  const { data: delivery } = await supabaseAdmin
    .from("deliveries")
    .select("id, company_id")
    .eq("id", deliveryId)
    .maybeSingle();

  if (!delivery) return { companyId: "", error: NextResponse.json({ error: "Delivery not found" }, { status: 404 }) };
  const delCompanyId = (delivery as { company_id?: string }).company_id;
  if (role !== "superuser" && delCompanyId !== companyId) {
    return { companyId: "", error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { companyId: delCompanyId || companyId, error: null };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const deliveryId = formData.get("deliveryId")?.toString()?.trim();
    const type = formData.get("type")?.toString()?.toLowerCase()?.trim();
    const file = formData.get("file") as File | null;

    if (!deliveryId) return NextResponse.json({ error: "deliveryId required" }, { status: 400 });
    if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: "type must be 'pod' or 'load'" }, { status: 400 });
    }
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const { companyId, error } = await ensureDeliveryAccess(deliveryId);
    if (error) return error;

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const bucket = type === "pod" ? "delivery_pod" : "delivery_load_photos";
    const ext = "jpg";
    const timestamp = Date.now();
    const path = `${companyId}/${deliveryId}/${timestamp}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

    if (uploadErr) {
      console.error("deliveries/upload storage error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: signed } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
    const url = signed?.signedUrl ?? "";

    if (type === "pod") {
      await supabaseAdmin.from("deliveries").update({ pod_url: url }).eq("id", deliveryId);
    } else {
      const { data: row } = await supabaseAdmin.from("deliveries").select("load_photos, load_url").eq("id", deliveryId).single();
      const prev = (row as { load_photos?: string[]; load_url?: string }) ?? {};
      const arr = Array.isArray(prev.load_photos) ? prev.load_photos : prev.load_url ? [prev.load_url] : [];
      const combined = [...arr.filter(Boolean), url];
      await supabaseAdmin.from("deliveries").update({ load_photos: combined, load_url: url }).eq("id", deliveryId);
    }

    const { data: updated } = await supabaseAdmin
      .from("deliveries")
      .select("id, reference, site_id, company_id, created_by, status, scheduled_at, notes, wholesaler, pod_url, load_url, load_photos, created_at")
      .eq("id", deliveryId)
      .single();

    return NextResponse.json({ success: true, url, delivery: updated });
  } catch (e) {
    console.error("POST /api/deliveries/upload failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
