"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/passwordPolicy";

export default function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-1.5 ${met ? "text-green-600" : "text-gray-500"}`}>
            {met ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
            <span>{rule.label}</span>
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
