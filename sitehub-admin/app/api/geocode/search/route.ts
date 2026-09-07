import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy for OpenStreetMap Nominatim search.
 * Browser → Nominatim often fails: CORS/referrer policy and Nominatim requires a
 * valid User-Agent identifying the app (cannot be set reliably from client fetch).
 *
 * Policy: https://operations.osmfoundation.org/policies/nominatim/
 */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const email = cookieStore.get("user_email")?.value;
  if (!role?.trim() && !email?.trim()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const countrycodes = url.searchParams.get("countrycodes")?.trim();
  const limitRaw = url.searchParams.get("limit")?.trim();
  const limit =
    limitRaw && /^\d+$/.test(limitRaw) ? limitRaw : "5";

  const params = new URLSearchParams({
    q,
    format: "json",
    limit,
    addressdetails: "0",
  });
  if (countrycodes) {
    params.set("countrycodes", countrycodes);
  }

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const userAgent =
    process.env.NOMINATIM_USER_AGENT?.trim() ||
    "SiteHubAdmin/1.0 (sites map search; contact: operator)";

  try {
    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "application/json",
        "Accept-Language": "en-GB",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[geocode/search] Nominatim HTTP", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: "Geocoding service error", detail: res.status },
        { status: 502 }
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("[geocode/search]", e);
    return NextResponse.json({ error: "Geocoding request failed" }, { status: 502 });
  }
}
