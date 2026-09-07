"use client";

import React, { useEffect, useRef, useState } from "react";

export default function FloatingShapes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - rect.left - rect.width / 2) * 0.02,
        y: (e.clientY - rect.top - rect.height / 2) * 0.02,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ filter: "blur(0.5px)" }}
    >
      <div
        className="absolute rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/10 blur-3xl"
        style={{
          width: "400px",
          height: "400px",
          top: "10%",
          left: "10%",
          animation: "float 15s ease-in-out infinite",
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
          transition: "transform 0.3s ease-out",
          boxShadow: "0 0 60px 20px rgba(59, 130, 246, 0.2)",
        }}
      />
      <div
        className="absolute blur-3xl"
        style={{
          width: "350px",
          height: "350px",
          top: "40%",
          right: "5%",
          animation: "float 18s ease-in-out infinite reverse",
          transform: `translate(${-mousePosition.x * 0.8}px, ${-mousePosition.y * 0.8}px)`,
          transition: "transform 0.3s ease-out",
          background:
            "conic-gradient(from 45deg, rgba(168, 85, 247, 0.15), rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.15))",
          clipPath:
            "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          boxShadow: "0 0 50px 15px rgba(168, 85, 247, 0.15)",
        }}
      />
      <div
        className="absolute blur-3xl"
        style={{
          width: "300px",
          height: "300px",
          bottom: "10%",
          left: "50%",
          transform: `translateX(-50%) translate(${mousePosition.x * 0.6}px, ${mousePosition.y * 0.6}px)`,
          transition: "transform 0.3s ease-out",
          animation: "float 20s ease-in-out infinite",
          background:
            "radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.2), rgba(34, 211, 238, 0.05))",
          borderRadius: "45% 55% 60% 40% / 55% 45% 55% 45%",
          boxShadow: "0 0 40px 10px rgba(6, 182, 212, 0.15)",
        }}
      />
    </div>
  );
}
