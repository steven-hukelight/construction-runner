"use client";

import React from "react";

export default function MorphingBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute -top-1/4 -left-1/4 w-[500px] h-[500px] md:w-[800px] md:h-[800px] rounded-full opacity-20 blur-3xl animate-blob"
        style={{
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(6, 182, 212, 0.4) 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 -right-1/4 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full opacity-20 blur-3xl animate-blob"
        style={{
          background:
            "radial-gradient(circle, rgba(147, 51, 234, 0.7) 0%, rgba(168, 85, 247, 0.4) 50%, transparent 70%)",
          animationDelay: "2s",
        }}
      />
      <div
        className="absolute -bottom-1/4 left-1/3 w-[700px] h-[700px] md:w-[1000px] md:h-[1000px] rounded-full opacity-15 blur-3xl animate-blob"
        style={{
          background:
            "radial-gradient(circle, rgba(6, 182, 212, 0.8) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 70%)",
          animationDelay: "4s",
        }}
      />
      <div
        className="absolute top-2/3 left-1/4 w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full opacity-25 blur-3xl animate-blob"
        style={{
          background:
            "radial-gradient(circle, rgba(168, 85, 247, 0.7) 0%, rgba(219, 39, 119, 0.3) 50%, transparent 70%)",
          animationDelay: "6s",
        }}
      />
      <div
        className="absolute top-1/2 right-1/3 w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full opacity-20 blur-3xl animate-blob-reverse"
        style={{
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.7) 0%, rgba(59, 130, 246, 0.4) 50%, transparent 70%)",
          animationDelay: "3s",
        }}
      />
    </div>
  );
}
