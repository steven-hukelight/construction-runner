"use client";

import React from "react";

const BLUE = "#2563EB";

type Summary = {
  total: number;
  completed: number;
  notStarted: number;
  expired: number;
};

export default function QuickInductionSummary({ summary }: { summary: Summary }) {
  const cards = [
    { label: "Total on site", value: summary.total, color: BLUE },
    { label: "Completed", value: summary.completed, color: "#059669" },
    { label: "Not started", value: summary.notStarted, color: "#6B7280" },
    { label: "Expired", value: summary.expired, color: "#D97706" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {c.label}
          </p>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ color: c.color }}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}
