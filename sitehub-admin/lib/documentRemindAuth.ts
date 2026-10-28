import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { isUuidLike } from "@/lib/auditLog";

export const HS_DOCUMENT_ADMIN_ROLES = new Set(["admin", "supervisor", "superuser"]);

export async function requireHsDocumentAdmin(req: Request): Promise<
  | { ok: true; companyId: string; role: string; actorId: string | null }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  if (!HS_DOCUMENT_ADMIN_ROLES.has(role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  let companyId = cookieStore.get("companyId")?.value?.trim() || "";
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || "";
  }

  const { searchParams } = new URL(req.url);
  if (role === "superuser") {
    companyId = searchParams.get("companyId")?.trim() || companyId;
  }

  if (!companyId) {
    return { ok: false, response: NextResponse.json({ error: "Company required" }, { status: 400 }) };
  }

  const uid = cookieStore.get("uid")?.value?.trim() ?? "";
  return { ok: true, companyId, role, actorId: uid && isUuidLike(uid) ? uid : null };
}
