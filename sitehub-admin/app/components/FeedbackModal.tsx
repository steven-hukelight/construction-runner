"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Button from "@/app/dashboard/components/ui/Button";
import {
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_EMAIL,
  type FeedbackCategoryId,
} from "@/lib/feedback";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Lighter panel on marketing / login backgrounds */
  tone?: "dashboard" | "marketing";
};

export default function FeedbackModal({ open, onClose, tone = "dashboard" }: Props) {
  const [category, setCategory] = useState<FeedbackCategoryId>("bug");
  const [comment, setComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDone(false);
    setSending(false);
    const t = requestAnimationFrame(() => panelRef.current?.querySelector("textarea")?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot.trim() !== "") {
      onClose();
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category,
          comment: comment.trim(),
          contactEmail: contactEmail.trim() || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : "",
          website: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
        );
        return;
      }
      setDone(true);
      setComment("");
      setContactEmail("");
      window.setTimeout(() => {
        onClose();
        setDone(false);
      }, 1600);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const cardBg = tone === "marketing" ? "bg-slate-900/95 border border-white/10" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600";
  const headingClass =
    tone === "marketing" ? "text-white" : "text-slate-900 dark:text-white";
  const mutedClass =
    tone === "marketing" ? "text-slate-400" : "text-slate-500 dark:text-slate-400";
  const labelClass =
    tone === "marketing" ? "text-slate-200" : "text-slate-700 dark:text-slate-200";
  const inputClass =
    tone === "marketing"
      ? "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-400/50"
      : "input w-full";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        className={`relative w-full max-w-md max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl shadow-2xl ${cardBg} p-6`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 rounded-lg p-1.5 transition-colors ${
            tone === "marketing"
              ? "text-slate-400 hover:bg-white/10 hover:text-white"
              : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="py-10 text-center">
            <p className={`text-lg font-medium ${headingClass}`}>Thanks — we received your feedback.</p>
            <p className={`mt-2 text-sm ${mutedClass}`}>You can close this window.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 id="feedback-dialog-title" className={`text-lg font-semibold ${headingClass}`}>
                Send feedback
              </h2>
              <p className={`mt-1 text-sm ${mutedClass}`}>
                Tell us what we should improve. This goes to our team at {FEEDBACK_EMAIL} — no mail app opens.
              </p>
            </div>

            <div className="space-y-2">
              <span className={`block text-sm font-medium ${labelClass}`}>What kind of feedback?</span>
              <div className="flex flex-col gap-2">
                {FEEDBACK_CATEGORY_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      category === opt.id
                        ? tone === "marketing"
                          ? "border-blue-400/60 bg-blue-500/15 text-white"
                          : "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                        : tone === "marketing"
                          ? "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                          : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="feedback-category"
                      value={opt.id}
                      checked={category === opt.id}
                      onChange={() => setCategory(opt.id)}
                      className="shrink-0"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-comment" className={`block text-sm font-medium ${labelClass} mb-1`}>
                Comments
              </label>
              <textarea
                id="feedback-comment"
                required
                minLength={3}
                maxLength={8000}
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what happened, what you expected, or what would help…"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="feedback-contact" className={`block text-sm font-medium ${labelClass} mb-1`}>
                Your email <span className="font-normal opacity-80">(optional)</span>
              </label>
              <input
                id="feedback-contact"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="If you’d like us to reply"
                className={inputClass}
              />
            </div>

            {/* Honeypot — leave hidden from users */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input
                id="feedback-website"
                tabIndex={-1}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
