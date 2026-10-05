"use client";

import { useEffect } from "react";

const PICKER_TYPES = new Set(["date", "datetime-local", "month", "week", "time"]);

/** Opens the browser calendar when any date-like input is clicked, not only its small icon. */
export default function NativeDatePickerOpener() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!PICKER_TYPES.has(target.type) || target.disabled || target.readOnly) return;
      try {
        target.showPicker?.();
      } catch {
        // showPicker throws when the input is not user-activatable (e.g. cross-origin iframe).
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
