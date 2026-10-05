/** Always written in capitals, even when the source label is all caps. */
const ACRONYMS = new Set(["RAMS", "COSHH", "PPE", "CSCS", "GDPR", "ID"]);

/** Role names written as proper nouns. */
const PROPER_NOUNS = ["Site Admin", "Super Admin", "Sub Admin"];

const PROPER_NOUN_PATTERNS = PROPER_NOUNS.map((name) => ({
  name,
  pattern: new RegExp(`\\b${name.replace(" ", "\\s")}\\b`, "gi"),
}));

/**
 * Display a status label in sentence case: "IN_PROGRESS" → "In progress",
 * "Pre-Induction Required" → "Pre-induction required". Acronyms inside
 * mixed-case labels, plus the allowlists above, keep their casing.
 */
export function toSentenceCase(input: string | null | undefined): string {
  const raw = (input ?? "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const allUpper = raw === raw.toUpperCase();
  const words = raw.split(" ").map((word, i) => {
    const bare = word.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (ACRONYMS.has(bare)) return word.toUpperCase();
    const isAcronym = !allUpper && word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word);
    if (isAcronym) return word;
    const lower = word.toLowerCase();
    return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  });
  return PROPER_NOUN_PATTERNS.reduce((text, { name, pattern }) => text.replace(pattern, name), words.join(" "));
}
