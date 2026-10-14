"use client";

import { useEffect, useState } from "react";
import { useClientSession } from "./ClientSessionProvider";
import { SitePicker } from "./ui/SitePicker";
import { getCurrentSiteIdFromCookie } from "@/lib/utils/cookies";

const ALL = "";

function writeSiteCookie(siteId: string) {
  if (!siteId) {
    document.cookie = "currentSiteId=; path=/; max-age=0; SameSite=Lax";
    return;
  }
  document.cookie = `currentSiteId=${encodeURIComponent(siteId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

/** Picks the site used by deliveries, RAMS, briefings, assets and the other site lists. */
export default function SiteSwitcher() {
  const { companyId, role } = useClientSession();
  const [sites, setSites] = useState<{ id: string; name?: string | null }[]>([]);
  const [selected, setSelected] = useState(ALL);

  useEffect(() => {
    if (!companyId) return;
    const current = getCurrentSiteIdFromCookie() ?? ALL;
    setSelected(current);
    fetch("/api/sites", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSites(list);
        if (current && !list.some((s: { id?: string }) => s.id === current)) {
          writeSiteCookie("");
          setSelected(ALL);
        }
      })
      .catch(() => setSites([]));
  }, [companyId]);

  if (!companyId || role?.toLowerCase() === "operative") return null;
  if (sites.length === 0) return null;

  function handleChange(siteId: string) {
    setSelected(siteId);
    writeSiteCookie(siteId);
    window.location.reload();
  }

  return (
    <div className="min-w-[180px]">
      <SitePicker
        sites={sites}
        value={selected}
        onChange={handleChange}
        variant="compact"
        allowNone
        noneLabel="All sites"
        noneValue={ALL}
        fieldLabel="Site"
        placeholder="All sites"
      />
    </div>
  );
}
