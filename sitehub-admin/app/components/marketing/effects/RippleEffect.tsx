"use client";

import { useEffect } from "react";

export default function RippleEffect() {
  useEffect(() => {
    const createRipple = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName !== "BUTTON" &&
        target.tagName !== "A" &&
        !target.closest("button") &&
        !target.closest("a") &&
        !target.classList.contains("ripple-target")
      ) {
        return;
      }

      const ripple = document.createElement("span");
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.classList.add("ripple-animation");

      const computedPosition = window.getComputedStyle(target).position;
      if (computedPosition === "static") {
        target.style.position = "relative";
      }
      target.style.overflow = "hidden";
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    document.addEventListener("click", createRipple);
    return () => document.removeEventListener("click", createRipple);
  }, []);

  return null;
}
