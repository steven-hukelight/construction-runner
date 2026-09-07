"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders into document.body so position:fixed overlays escape .main-content’s
 * stacking context and paint above the fixed sidebar (z-index 40).
 */
export function PortalOverlay({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
