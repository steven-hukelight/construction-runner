"use client";

import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import FeedbackModal from "@/app/components/FeedbackModal";

type Variant = "topbar" | "button" | "landing" | "login";

export default function FeedbackLink({ variant = "topbar" }: { variant?: Variant }) {
  const [open, setOpen] = useState(false);

  const base =
    "inline-flex items-center gap-1.5 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded-lg";

  const styles: Record<Variant, string> = {
    topbar:
      "text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-sm px-2 py-1.5",
    button:
      "text-gray-700 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm",
    landing: "text-slate-500 hover:text-slate-300 transition-colors",
    login: "text-sm text-slate-600 hover:text-blue-600 underline underline-offset-4",
  };

  const tone = variant === "landing" || variant === "login" ? "marketing" : "dashboard";

  return (
    <>
      <button
        type="button"
        className={`${base} ${styles[variant]}`}
        title="Send feedback about the app"
        aria-label="Open feedback form"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-[1.1em] w-[1.1em] shrink-0 opacity-90" aria-hidden />
        {variant === "topbar" ? (
          <span className="hidden sm:inline">Feedback</span>
        ) : (
          <span>Feedback</span>
        )}
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} tone={tone} />
    </>
  );
}
