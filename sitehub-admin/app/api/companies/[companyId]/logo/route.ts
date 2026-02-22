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

    // Companies table may not have logoUrl column yet; URL is still returned to client
    await supabaseAdmin
      .from("companies")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", companyId);

    return NextResponse.json({ logoUrl: fileUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("POST /api/companies/[companyId]/logo:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
