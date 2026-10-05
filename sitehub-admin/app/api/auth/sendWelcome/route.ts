import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadWelcomeRecipient, sendApprovalWelcomeEmail } from "@/lib/sendApprovalWelcomeEmail";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value?.toLowerCase();
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (role !== "superuser" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, tempPassword } = await req.json();
    if (!userId) return NextResponse.json({ error: "missing" }, { status: 400 });

    const user = await loadWelcomeRecipient(userId);
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
    if (role === "admin" && user.company_id !== cookieStore.get("companyId")?.value) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const email = user.email;
    if (!email) return NextResponse.json({ error: "no email" }, { status: 400 });

    const { info } = await sendApprovalWelcomeEmail({ ...user, email }, tempPassword);
    return NextResponse.json(info === undefined ? { ok: true } : { ok: true, info });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
