"use client";

import React from "react";

export function LightBeams() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse"
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      />
      <div
        className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"
        style={{ animationDuration: "6s", animationDelay: "2s" }}
      />
    </div>
  );
}
