"use client";

import { useRef } from "react";

export type PlanPin = { id: string; name: string; plan_x: number | null; plan_y: number | null };

/** Click the plan to place a pin. Positions are stored as 0–1 fractions of the image. */
export default function MusterPlanPin({
  src,
  points,
  activeId,
  onPlace,
}: {
  src: string;
  points: PlanPin[];
  activeId: string | null;
  onPlace?: (x: number, y: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  function click(e: React.MouseEvent<HTMLDivElement>) {
    if (!onPlace || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onPlace(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
  }

  return (
    <div
      ref={box}
      className={`relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${onPlace ? "cursor-crosshair" : ""}`}
      onClick={click}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Site plan" className="block w-full h-auto max-h-[420px] object-contain mx-auto" />
      {points.map((p, i) =>
        p.plan_x == null || p.plan_y == null ? null : (
          <span
            key={p.id}
            title={p.name}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shadow ${
              p.id === activeId ? "bg-red-600 text-white ring-2 ring-white" : "bg-blue-600 text-white"
            }`}
            style={{ left: `${p.plan_x * 100}%`, top: `${p.plan_y * 100}%` }}
          >
            {i + 1}
          </span>
        ),
      )}
    </div>
  );
}
