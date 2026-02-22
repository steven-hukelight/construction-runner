import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { writeAuditLog } from "@/lib/auditLog";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await import("@/lib/auth/companyId").then((m) =>
          m.resolveCompanyId({
            cookieCompanyId: cookieStore.get("companyId")?.value,
            userEmail: cookieStore.get("user_email")?.value,
            role,
          })
        )) || undefined;
    }

    const canOverride = role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";

    if (!canOverride) {
      return NextResponse.json(
        { error: "Only superuser or main contractor admin can set Pre-Induction Override" },
        { status: 403 }
      );
    }

    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (role !== "superuser") {
      const userCompanyId = cid(user);
      if (companyId !== userCompanyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const adminPreInductionOverride = !!body.adminPreInductionOverride;

    await supabaseAdmin.from("users").update({
      admin_pre_induction_override: adminPreInductionOverride,
    }).eq("id", userId);

    const actorId = (await cookies()).get("uid")?.value ?? "unknown";
    const actorEmail = (await cookies()).get("user_email")?.value ?? null;
    await writeAuditLog({
      userId,
      action: "override_pre_induction",
      timestamp: new Date(),
      actorId,
      actorEmail,
      metadata: { adminPreInductionOverride },
    });

    return NextResponse.json({ success: true, adminPreInductionOverride });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction override:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
