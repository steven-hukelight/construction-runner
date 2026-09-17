"use client";

import { createContext, useContext, type ReactNode } from "react";
import { hydrateClientSession, type ClientSessionSnapshot } from "@/lib/utils/cookies";

const ClientSessionContext = createContext<ClientSessionSnapshot | null>(null);

export function ClientSessionProvider({
  initial,
  children,
}: {
  initial: ClientSessionSnapshot;
  children: ReactNode;
}) {
  if (typeof window !== "undefined") {
    hydrateClientSession(initial);
  }
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
