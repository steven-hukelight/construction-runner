"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";

export type TableActionItem = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  icon?: ComponentType<{ className?: string }>;
  heading?: string;
  divider?: boolean;
};

export const ACTION_MENU_WIDTH = 224;

export const ACTION_MENU_PANEL_CLASS =
  "w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-slate-800";

export const ACTION_MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors duration-[120ms] hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

export const ACTION_MENU_ITEM_DANGER_CLASS =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors duration-[120ms] hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:text-red-400 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50";

function menuRoot(): HTMLElement {
  let el = document.getElementById("table-actions-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "table-actions-root";
    document.documentElement.appendChild(el);
  }
  return el;
}

export default function TableActions({ items }: { items: TableActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menuEl = menuRef.current;
    menuEl.style.maxHeight = "none";
    const menuHeight = menuEl.scrollHeight;
    const spaceBelow = window.innerHeight - trigger.bottom - 8;
    const spaceAbove = trigger.top - 8;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(120, available);
    const top = openUp ? Math.max(8, trigger.top - Math.min(menuHeight, maxHeight) - 4) : trigger.bottom + 4;
    const left = Math.min(
      Math.max(8, trigger.right - ACTION_MENU_WIDTH),
      Math.max(8, window.innerWidth - ACTION_MENU_WIDTH - 8)
    );
    setPosition((prev) =>
      prev.top === top && prev.left === left && prev.maxHeight === maxHeight
        ? prev
        : { top, left, maxHeight }
    );
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (triggerRef.current?.contains(target) || target.closest("[data-table-actions-menu]")) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleViewportChange(e: Event) {
      const menuEl = menuRef.current;
      if (menuEl && e.target instanceof Node && menuEl.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  if (!items.length) return null;

  const menu = open && (
    <div
      ref={menuRef}
      role="menu"
      data-table-actions-menu
      className={`${ACTION_MENU_PANEL_CLASS} overflow-y-auto`}
      style={{
        position: "fixed",
        zIndex: 9999,
        top: position.top,
        left: position.left,
        width: ACTION_MENU_WIDTH,
        height: "fit-content",
        maxHeight: position.maxHeight || undefined,
      }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const danger = item.variant === "danger";
        const firstDanger = danger && items.slice(0, i).every((prev) => prev.variant !== "danger");
        const showRule = Boolean(item.heading) || item.divider || (firstDanger && i > 0);
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {showRule ? (
              <div className={`${i > 0 ? "mt-1 border-t border-gray-100 pt-1 dark:border-slate-600" : ""}`}>
                {item.heading ? (
                  <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                    {item.heading}
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={danger ? ACTION_MENU_ITEM_DANGER_CLASS : ACTION_MENU_ITEM_CLASS}
            >
              {Icon ? (
                <Icon
                  className={`h-4 w-4 shrink-0 ${danger ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}
                />
              ) : null}
              <span className="min-w-0 truncate">{item.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="row-menu-button"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <EllipsisVertical className="h-4 w-4" aria-hidden />
      </button>
      {typeof document !== "undefined" && menu && createPortal(menu, menuRoot())}
    </div>
  );
}
