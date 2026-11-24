"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Modal from "./Modal";
import Button from "./Button";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={open} onClose={() => finish(false)} title={opts?.title ?? "Confirm"}>
        <p className="text-sm text-gray-600 dark:text-slate-300">{opts?.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => finish(false)}>
            {opts?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={opts?.danger ? "danger" : "primary"}
            onClick={() => finish(true)}
          >
            {opts?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  return (options) =>
    Promise.resolve(window.confirm([options.title, options.message].filter(Boolean).join("\n\n")));
}
