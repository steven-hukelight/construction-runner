"use client";

import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import Button from "@/app/dashboard/components/ui/Button";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export default function SuperuserSelfOverrideBlock() {
  const [loading, setLoading] = useState(false);
  const [overrideOn, setOverrideOn] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip the fetch entirely when the pre-induction UI is disabled site-wide.
    if (!preInductionUiEnabled) return;
    fetch("/api/profiles/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) && json.length ? json[0] : null;
        if (data) setOverrideOn(!!(data as { adminPreInductionOverride?: boolean }).adminPreInductionOverride);
      })
      .catch(() => {});
  }, []);

  // Hide the self-override UI when the pre-induction UI is disabled site-wide.
  // The backing API is still there for restoration.
  if (!preInductionUiEnabled) return null;

  async function toggleOverride() {
    setLoading(true);
    try {
      const res = await fetch("/api/pre-induction/me/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPreInductionOverride: !overrideOn }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOverrideOn(!!data.adminPreInductionOverride);
      } else {
        alert(data.error || "Failed to update override");
      }
    } catch {
      alert("Failed to update override");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/30 p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
          <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-slate-100">Pre-Induction Self-Override</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {overrideOn
              ? "Override is on — you can access site login and assess induction flows."
              : "Enable override to access site login without completing pre-induction."}
          </p>
        </div>
      </div>
      <Button
        variant={overrideOn ? "secondary" : "primary"}
        size="sm"
        onClick={toggleOverride}
        disabled={loading}
      >
        {loading ? "Updating…" : overrideOn ? "Remove Override" : "Apply Override to My Account"}
      </Button>
    </div>
  );
}
