/**
 * POST /api/admin/auth/2fa/verify
 * Placeholder for 2FA verification. Not implemented yet.
 */
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = body.code;
  const credentialId = body.credentialId;

  if (!code && !credentialId) {
    return NextResponse.json(
      { error: "Missing verification data. Provide 'code' (TOTP) or 'credentialId' (WebAuthn)." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      implemented: false,
      message: "2FA verification is not implemented yet.",
    },
    { status: 501 }
  );
}
