import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { uploadFile, getFileUrl } from "@/supabase/storage/storageClient";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/companies/[companyId]/logo
 * Upload company logo. Company admin or superuser only.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const cookieCompanyId = cookieStore.get("companyId")?.value;

    const isSuperuser = role === "superuser";
    const isOwnCompany = cookieCompanyId === companyId;

    if (!isSuperuser && !isOwnCompany) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file required" },
        { status: 400 }
      );
    }

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use PNG, JPEG, or WebP." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `${companyId}/${Date.now()}.${ext}`;
    const bucketName = "company-logos";
    // file is already a Blob
    await uploadFile(bucketName, path, file);
    const fileUrl = await getFileUrl(bucketName, path);

    const { error: updErr } = await supabaseAdmin
      .from("companies")
      .update({ logo_url: fileUrl, updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (updErr) {
      console.error("companies logo_url update:", updErr.message);
    }

    return NextResponse.json({ logoUrl: fileUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("POST /api/companies/[companyId]/logo:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/companies/[companyId]/logo
 * Clear company logo URL. Company admin or superuser only.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const cookieCompanyId = cookieStore.get("companyId")?.value;

    const isSuperuser = role === "superuser";
    const isOwnCompany = cookieCompanyId === companyId;

    if (!isSuperuser && !isOwnCompany) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("companies")
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (error) {
      console.error("companies logo_url clear:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete failed";
    console.error("DELETE /api/companies/[companyId]/logo:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
