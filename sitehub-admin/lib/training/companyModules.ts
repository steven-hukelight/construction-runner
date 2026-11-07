/** Questions a company writes for a module. The module's pass mark (4) applies. */
export const COMPANY_QUESTION_COUNT = 5;
export const MODULE_TITLE_MAX = 80;
export const MODULE_SUMMARY_MAX = 400;
export const QUESTION_STEM_MAX = 300;
export const QUESTION_OPTION_MAX = 150;

export type CompanyModuleDetails = { title: string; summary: string; minutes: number | null };

export function companyModuleDetails(input: {
  title: unknown;
  summary: unknown;
  minutes: unknown;
}): CompanyModuleDetails | { error: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { error: "Give the module a title" };
  if (title.length > MODULE_TITLE_MAX) return { error: `Keep the title under ${MODULE_TITLE_MAX} characters` };
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  if (summary.length > MODULE_SUMMARY_MAX) return { error: `Keep the summary under ${MODULE_SUMMARY_MAX} characters` };
  let minutes: number | null = null;
  if (input.minutes !== null && input.minutes !== undefined && input.minutes !== "") {
    const n = Number(input.minutes);
    if (!Number.isInteger(n) || n < 1 || n > 60) return { error: "Minutes must be 1 to 60" };
    minutes = n;
  }
  return { title, summary, minutes };
}

export type CompanyQuestionInput = { stem: string; options: [string, string, string]; correctIndex: number };

/** Exactly five questions, each with three different answers and one marked correct. */
export function parseCompanyQuestions(value: unknown): CompanyQuestionInput[] | { error: string } {
  if (!Array.isArray(value) || value.length !== COMPANY_QUESTION_COUNT) {
    return { error: `Write exactly ${COMPANY_QUESTION_COUNT} questions` };
  }
  const out: CompanyQuestionInput[] = [];
  for (const [i, raw] of value.entries()) {
    const n = i + 1;
    const q = (raw ?? {}) as { stem?: unknown; options?: unknown; correctIndex?: unknown };
    const stem = typeof q.stem === "string" ? q.stem.trim() : "";
    if (!stem) return { error: `Question ${n} needs wording` };
    if (stem.length > QUESTION_STEM_MAX) return { error: `Question ${n} is too long` };
    if (!Array.isArray(q.options) || q.options.length !== 3) return { error: `Question ${n} needs three answers` };
    const options = q.options.map((o) => (typeof o === "string" ? o.trim() : ""));
    if (options.some((o) => !o)) return { error: `Question ${n} has an empty answer` };
    if (options.some((o) => o.length > QUESTION_OPTION_MAX)) return { error: `An answer in question ${n} is too long` };
    if (new Set(options.map((o) => o.toLowerCase())).size !== 3) return { error: `Question ${n} has the same answer twice` };
    const correctIndex = Number(q.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 2) {
      return { error: `Mark the right answer for question ${n}` };
    }
    out.push({ stem, options: options as [string, string, string], correctIndex });
  }
  return out;
}
