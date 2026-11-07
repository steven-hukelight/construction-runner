export type TrainingStatus = "not_started" | "in_progress" | "passed" | "due_again";
export type FaceFitStatus = "current" | "review_soon" | "due";

export const FACE_FIT_MODULE_ID = "face-fit";
export const FACE_FIT_REVIEW_SOON_DAYS = 30;
export const FAILS_BEFORE_SUPERVISOR_NOTE = 3;
const DEFAULT_MIN_WATCH_SECONDS = 30;
const WATCH_FRACTION = 0.8;

/** Shortest time a document must be open before the quiz unlocks. */
export const DOCUMENT_MIN_READ_SECONDS = 60;

export type ModulePlayback = {
  video_path: string | null;
  external_url: string | null;
  document_path?: string | null;
};

export function isPlayable(module: ModulePlayback): boolean {
  return Boolean(module.video_path?.trim() || module.external_url?.trim() || module.document_path?.trim());
}

export function addMonths(iso: string, months: number): Date {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export type StatusInput = {
  lastPassedAt: string | null;
  refreshMonths: number | null;
  /** Any view started or attempt submitted after the last pass (or ever, with no pass). */
  activitySincePass: boolean;
  now?: Date;
};

export function moduleStatus(input: StatusInput): { status: TrainingStatus; dueAt: string | null } {
  const now = input.now ?? new Date();
  if (input.lastPassedAt) {
    if (input.refreshMonths == null) return { status: "passed", dueAt: null };
    const due = addMonths(input.lastPassedAt, input.refreshMonths);
    return { status: due.getTime() <= now.getTime() ? "due_again" : "passed", dueAt: due.toISOString() };
  }
  return { status: input.activitySincePass ? "in_progress" : "not_started", dueAt: null };
}

export function needsAction(status: TrainingStatus): boolean {
  return status !== "passed";
}

/**
 * Shortest time between starting and finishing a video. Uses the module's own value when set,
 * otherwise 80% of the length the player reported, never less than 30 seconds.
 */
export function requiredWatchSeconds(minWatchSeconds: number | null, reportedDurationSeconds: number | null): number {
  if (minWatchSeconds && minWatchSeconds > 0) return minWatchSeconds;
  const reported = Number(reportedDurationSeconds);
  if (Number.isFinite(reported) && reported > 0) {
    return Math.max(DEFAULT_MIN_WATCH_SECONDS, Math.floor(reported * WATCH_FRACTION));
  }
  return DEFAULT_MIN_WATCH_SECONDS;
}

export function watchedLongEnough(startedAt: string, now: Date, requiredSeconds: number): boolean {
  const elapsed = (now.getTime() - new Date(startedAt).getTime()) / 1000;
  return elapsed >= requiredSeconds;
}

export type QuizQuestion = { id: string; stem: string; options: string[]; correct_index: number };

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, unknown>,
  passMark: number,
): { score: number; total: number; passed: boolean; correctIds: string[] } {
  const correctIds: string[] = [];
  for (const q of questions) {
    const chosen = Number(answers[q.id]);
    if (Number.isInteger(chosen) && chosen === q.correct_index) correctIds.push(q.id);
  }
  const total = questions.length;
  const score = correctIds.length;
  return { score, total, passed: total > 0 && score >= Math.min(passMark, total), correctIds };
}

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Question order and option order both shuffle. Each option keeps its stored index for scoring. */
export function quizForPhone(questions: QuizQuestion[], random: () => number = Math.random) {
  return shuffled(questions, random).map((q) => ({
    id: q.id,
    stem: q.stem,
    options: shuffled(
      q.options.map((text, index) => ({ index, text })),
      random,
    ),
  }));
}

/** Failed attempts since the most recent pass, newest first in `attempts`. */
export function failsInARow(attempts: { passed: boolean }[]): number {
  let n = 0;
  for (const a of attempts) {
    if (a.passed) break;
    n += 1;
  }
  return n;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function faceFitStatus(
  latest: { result: string; review_due_at: string } | null,
  now: Date = new Date(),
): FaceFitStatus {
  if (!latest || latest.result !== "pass") return "due";
  const today = dateOnly(now);
  const due = String(latest.review_due_at).slice(0, 10);
  if (due < today) return "due";
  const soon = new Date(now);
  soon.setUTCDate(soon.getUTCDate() + FACE_FIT_REVIEW_SOON_DAYS);
  return due <= dateOnly(soon) ? "review_soon" : "current";
}

export function campaignIsLive(campaign: { starts_on: string; ends_on: string }, now: Date = new Date()): boolean {
  const today = dateOnly(now);
  return String(campaign.starts_on).slice(0, 10) <= today && today <= String(campaign.ends_on).slice(0, 10);
}