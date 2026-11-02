"use client";

import { useEffect, useState } from "react";
import { useClientSession } from "./ClientSessionProvider";
import { SitePicker } from "./ui/SitePicker";
import { getCurrentSiteIdFromCookie } from "@/lib/utils/cookies";
import { useSites } from "@/lib/hooks/useDashboardData";

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
  const { data: sitesData } = useSites(!!companyId);
  const sites = sitesData ?? [];
  const [selected, setSelected] = useState(() => getCurrentSiteIdFromCookie() ?? ALL);

  useEffect(() => {
    if (!sitesData || !selected) return;
    if (!sitesData.some((s) => s.id === selected)) {
      writeSiteCookie("");
      queueMicrotask(() => setSelected(ALL));
    }
  }, [sitesData, selected]);

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
