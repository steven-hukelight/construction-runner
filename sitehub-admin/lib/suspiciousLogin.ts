/**
 * Suspicious login detection: new device, new IP, unusual country.
 * Only flags; does not block.
 */
import { supabaseAdmin } from "./supabaseAdmin";

export interface SuspiciousResult {
  suspicious: boolean;
  reasons: string[];
}

export async function checkSuspiciousLogin(params: {
  userId: string;
  ipAddress: string;
  userAgent: string;
  deviceType?: string;
}): Promise<SuspiciousResult> {
  const reasons: string[] = [];

  // Get country from common proxy headers
  const country = params.ipAddress === "unknown" ? null : null; // Can be enhanced with geo lookup

  const { data: known } = await supabaseAdmin
    .from("user_known_devices")
    .select("id, ip_address, country")
    .eq("user_id", params.userId);

  const knownDevices = known ?? [];
  const seenIps = new Set(knownDevices.map((d) => (d as { ip_address: string | null }).ip_address).filter(Boolean));
  const seenCountries = new Set(knownDevices.map((d) => (d as { country: string | null }).country).filter(Boolean));

  if (knownDevices.length === 0) {
    reasons.push("new_device");
  }
  if (params.ipAddress !== "unknown" && !seenIps.has(params.ipAddress)) {
    reasons.push("new_ip");
  }
  if (country && !seenCountries.has(country)) {
    reasons.push("new_country");
  }

  const suspicious = reasons.length > 0;
  if (suspicious) {
    await upsertKnownDevice(params.userId, params.ipAddress, params.userAgent, params.deviceType, country);
  }
  return { suspicious, reasons };
}

async function upsertKnownDevice(
  userId: string,
  ipAddress: string,
  userAgent: string,
  deviceType?: string,
  country?: string | null
): Promise<void> {
  const fingerprint = [userAgent, ipAddress].join("|").slice(0, 500);
  await supabaseAdmin.from("user_known_devices").upsert(
    {
      user_id: userId,
      device_fingerprint: fingerprint,
      ip_address: ipAddress,
      country: country ?? null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_fingerprint", ignoreDuplicates: false }
  );
}
