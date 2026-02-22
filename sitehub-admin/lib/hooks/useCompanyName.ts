"use client";

import { useState, useEffect, useCallback } from "react";

const cache: Record<string, string | null> = {};

export function useCompanyName(companyId: string | null | undefined): string | null {
  const [name, setName] = useState<string | null>(() =>
    companyId ? (cache[companyId] ?? null) : null
  );

  useEffect(() => {
    if (!companyId) {
      setName(null);
      return;
    }
    if (cache[companyId] !== undefined) {
      setName(cache[companyId]);
      return;
    }
    let cancelled = false;
    fetch(`/api/company-name?companyId=${encodeURIComponent(companyId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.name !== undefined) {
          cache[companyId] = data.name;
          setName(data.name);
        }
      })
      .catch(() => {
        if (!cancelled) setName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return name;
}
