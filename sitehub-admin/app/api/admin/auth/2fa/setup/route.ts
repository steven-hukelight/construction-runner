/**
 * POST /api/admin/auth/2fa/setup
 * Placeholder for 2FA setup. Not implemented yet.
 */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const method = (body.method as string)?.toLowerCase();

  if (!method || !["totp", "webauthn"].includes(method)) {
    return NextResponse.json(
      { error: "Invalid or missing method. Must be 'totp' or 'webauthn'." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      implemented: false,
      message: "2FA setup is not implemented yet.",
    },
    { status: 501 }
  );
}
