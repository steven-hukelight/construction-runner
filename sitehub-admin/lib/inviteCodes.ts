import { randomInt } from "crypto";

export const SUBCONTRACTOR_INVITE_TYPE = "subcontractor";

/** No 0/O or 1/I, so codes survive being read aloud or copied by hand. */
const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 10;

export function generateInviteCode(length = INVITE_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/** Every rejection of a code (unknown, wrong type, expired, used up, email already registered) looks identical. */
export const REDEEM_GENERIC_FAILURE = { error: "Invalid invite code" } as const;

/** Rejections are padded to at least this long so lookups that succeed or fail early cannot be told apart by timing. */
export const REDEEM_FAILURE_MIN_MS = 800;

export const REDEEM_RATE_LIMITS = {
  perIp: { max: 10, windowMs: 15 * 60 * 1000 },
  perCode: { max: 5, windowMs: 15 * 60 * 1000 },
} as const;
