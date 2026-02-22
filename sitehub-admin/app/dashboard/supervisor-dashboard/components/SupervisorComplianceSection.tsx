"use client";

import React, { useEffect, useState } from "react";
import SupervisorCompliancePanel from "./SupervisorCompliancePanel";

type Site = { id: string; name?: string };

export default function SupervisorComplianceSection() {
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    fetch("/api/sites", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setSites(Array.isArray(json) ? json : []))
      .catch(() => setSites([]));
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Compliance Overview</h3>
      <p className="text-sm text-gray-500 mb-6">
        View real-time compliance status for operatives assigned to your sites.
      </p>
      <SupervisorCompliancePanel sites={sites} />
    </div>
  );
}
