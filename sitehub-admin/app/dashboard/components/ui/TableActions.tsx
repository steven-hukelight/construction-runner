"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export type TableActionItem = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

export default function TableActions({ items }: { items: TableActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, bottom: 0, openUp: false });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !ref.current || typeof document === "undefined") return;
    const rect = ref.current.getBoundingClientRect();
    const menuHeight = Math.min(items.length * 40 + 16, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setPosition({
      top: rect.bottom + 4,
      left: Math.min(rect.left, Math.max(0, window.innerWidth - 180)),
      bottom: window.innerHeight - rect.top + 4,
      openUp,
    });
  }, [open, items.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (ref.current?.contains(target) || target.closest("[data-table-actions-menu]")) return;
      setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (!items.length) return null;

  const menu = open && (
    <div
      data-table-actions-menu
      className="fixed py-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999]"
      style={{
        top: position.openUp ? undefined : position.top,
        bottom: position.openUp ? position.bottom : undefined,
        left: position.left,
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            item.onClick();
            setOpen(false);
          }}
          className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
            item.variant === "danger"
              ? "text-red-600 hover:bg-red-50"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Actions"
      >
        <span className="sr-only">Actions</span>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>
      {typeof document !== "undefined" && menu && createPortal(menu, document.body)}
    </div>
  );
}
