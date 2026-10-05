"use client";

import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import { hydrateClientSession, type ClientSessionSnapshot } from "@/lib/utils/cookies";

const ClientSessionContext = createContext<ClientSessionSnapshot | null>(null);

export function ClientSessionProvider({
  initial,
  children,
}: {
  initial: ClientSessionSnapshot;
  children: ReactNode;
}) {
  // Keep getRoleFromClient() in sync for click handlers. Context is the source of truth.
  if (typeof window !== "undefined") {
    hydrateClientSession(initial);
  }
  useLayoutEffect(() => {
    hydrateClientSession(initial);
  }, [initial]);
  return <ClientSessionContext.Provider value={initial}>{children}</ClientSessionContext.Provider>;
}

export function useClientSession(): ClientSessionSnapshot {
  const ctx = useContext(ClientSessionContext);
  if (ctx) return ctx;
  return {
    role: null,
    companyId: null,
    email: "",
    uid: "",
    impersonating: false,
    sessionStartedAt: null,
  };
}
