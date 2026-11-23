"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/passwordPolicy";

export default function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        const started = password.length > 0;
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${met ? "text-emerald-700" : "text-gray-500"}`}
          >
            {met ? <Check size={14} aria-hidden /> : started ? <X size={14} aria-hidden /> : <span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-300" aria-hidden />}
            <span>{rule.label}</span>
            {started ? <span className="sr-only">{met ? "(met)" : "(not met)"}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
