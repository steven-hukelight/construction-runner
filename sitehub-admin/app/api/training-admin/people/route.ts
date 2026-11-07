import { NextResponse } from "next/server";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { peopleMatrix } from "@/lib/training/service";

export const dynamic = "force-dynamic";

/** Everyone in the company against each module that is switched on, plus face fit. */
export async function GET(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await peopleMatrix(auth.companyId));
  } catch (e) {
    console.error("GET /api/training-admin/people:", e);
    return NextResponse.json({ error: "Couldn't load people" }, { status: 500 });
  }
}
