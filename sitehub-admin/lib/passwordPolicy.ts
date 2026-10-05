/** Must match the mobile app (lib/utils/password_policy.dart) and Supabase Auth password requirements. */
export const PASSWORD_MIN_LENGTH = 8;

/** Symbol set accepted by Supabase Auth's "lowercase, uppercase, digits and symbols" requirement. */
const SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export type PasswordRule = { id: string; label: string; test: (password: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "A number (0–9)", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "A symbol, such as ! @ # $ % & *", test: (p) => [...p].some((c) => SYMBOLS.includes(c)) },
];

export const PASSWORD_REQUIREMENTS_MESSAGE =
  `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, a number and a symbol.`;

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
