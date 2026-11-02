import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { isStagedUploadKind, startStagedUpload } from "@/lib/storage/stagedUpload";

/** `{ kind, fileName, size }` returns `{ uploadUrl, token }`; PUT the file to `uploadUrl`, then send `token` to the owning upload route as `stagedToken`. */
export async function POST(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isStagedUploadKind(body.kind)) return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 });
  const result = await startStagedUpload(body.kind, String(body.fileName ?? ""), Number(body.size));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
