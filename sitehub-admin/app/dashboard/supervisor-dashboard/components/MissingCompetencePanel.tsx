"use client";

import Link from "next/link";
import useSWR from "swr";
import { ShieldAlert } from "lucide-react";

type MissingItem = {
  subjectType: "rams" | "task";
  subjectId: string;
  subjectTitle: string;
  requirement: string;
  detail: string;
};

type MissingPerson = {
  userId: string;
  name: string;
  companyName: string;
  missing: MissingItem[];
  unchecked: string[];
};

type Payload = { onSite: number; people: MissingPerson[] };

const fetcher = (url: string) =>
  fetch(url, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Payload>) : null));

/** People signed in at the site now who lack a card or ticket listed on their RAMS or task. */
export default function MissingCompetencePanel({ siteId }: { siteId: string }) {
  const { data, isLoading } = useSWR<Payload | null>(
    siteId ? `/api/competence/missing?siteId=${encodeURIComponent(siteId)}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );

  const lacking = (data?.people ?? []).filter((p) => p.missing.length > 0);
  const uncheckedOnly = (data?.people ?? []).filter((p) => p.missing.length === 0 && p.unchecked.length > 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-semibold text-gray-900">Missing competence today</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        People signed in now who are on a RAMS or task that lists a card or ticket they don&apos;t hold. Add requirements
        on a RAMS page or in a task.
      </p>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-gray-500">Could not load.</p>
      ) : lacking.length === 0 ? (
        <p className="text-sm text-gray-600">
          {data.onSite === 0
            ? "Nobody is signed in at this site right now."
            : `Nobody of the ${data.onSite} signed in is missing a listed card or ticket.`}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {lacking.map((p) => (
            <li key={p.userId} className="py-2">
              <p className="text-sm font-semibold text-gray-900">
                {p.name}
                {p.companyName ? <span className="font-normal text-gray-500"> · {p.companyName}</span> : null}
              </p>
              <ul className="mt-1 space-y-0.5">
                {p.missing.map((m) => (
                  <li key={`${m.subjectType}-${m.subjectId}-${m.requirement}`} className="text-sm text-gray-700">
                    <span className="font-medium text-red-700">{m.requirement}</span> for{" "}
                    {m.subjectType === "rams" ? (
                      <Link href={`/dashboard/health-and-safety/rams/${m.subjectId}`} className="table-link">
                        {m.subjectTitle}
                      </Link>
                    ) : (
                      <span>task “{m.subjectTitle}”</span>
                    )}
                    <span className="text-gray-500"> · {m.detail}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {uncheckedOnly.length > 0 ? (
        <p className="mt-3 text-xs text-amber-700">
          {uncheckedOnly.length === 1 ? "1 person relies" : `${uncheckedOnly.length} people rely`} on a card no
          supervisor has checked yet: {uncheckedOnly.map((p) => p.name).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
