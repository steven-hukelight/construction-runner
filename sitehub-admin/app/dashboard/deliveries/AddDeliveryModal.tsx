"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useRouter } from "next/navigation";
import { createDelivery } from "./actions";
import { getCurrentSiteIdFromCookie } from "@/lib/utils/cookies";

interface Site { id: string; name?: string; [k: string]: unknown }

export default function AddDeliveryModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({
    reference: "",
    wholesaler: "",
    siteId: "",
    site: "",
    scheduledAt: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/sites", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const sitesList = Array.isArray(list) ? list : [];
        setSites(sitesList);
        const currentSiteId = getCurrentSiteIdFromCookie();
        let siteIdToUse = "";
        let siteNameToUse = "";
        if (currentSiteId && sitesList.some((s: Site) => s.id === currentSiteId)) {
          const s = sitesList.find((x: Site) => x.id === currentSiteId);
          siteIdToUse = currentSiteId;
          siteNameToUse = s?.name ?? currentSiteId;
        } else if (sitesList.length === 1) {
          siteIdToUse = sitesList[0].id;
          siteNameToUse = sitesList[0].name ?? sitesList[0].id;
        }
        if (siteIdToUse) {
          setForm((f) => ({ ...f, siteId: siteIdToUse, site: siteNameToUse }));
        }
      })
      .catch(() => setSites([]));
  }, [open]);

  async function handleSubmit() {
    await createDelivery(form);
    setOpen(false);
    setForm({ reference: "", wholesaler: "", siteId: "", site: "", scheduledAt: "", notes: "" });
    router.refresh();
  }

  function onSiteSelect(value: string) {
    if (value === "__other__") {
      setForm((f) => ({ ...f, siteId: "", site: "" }));
      return;
    }
    const s = sites.find((x) => x.id === value);
    setForm((f) => ({ ...f, siteId: value, site: s?.name ?? value }));
  }

  const selectedSiteId = form.siteId && sites.some((s) => s.id === form.siteId) ? form.siteId : (form.site || form.siteId ? "__other__" : "");

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Add Delivery"}
      </Button>
      {open && (
        <div className="card w-full md:max-w-xl">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Add Delivery</h3>
          <div className="space-y-3 sm:space-y-4">
            <Input
              label="Reference"
              value={form.reference}
              onChange={(e: any) => setForm({ ...form, reference: e.target.value })}
            />
            <Input
              label="Supplier / Wholesaler"
              value={form.wholesaler}
              onChange={(e: any) => setForm({ ...form, wholesaler: e.target.value })}
              placeholder="e.g. Edmunsons, Medlocks"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&>option]:text-slate-900 [&>option]:bg-white"
                value={selectedSiteId}
                onChange={(e) => onSiteSelect(e.target.value)}
              >
                <option value="">Select site...</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900">{s.name || s.id}</option>
                ))}
                <option value="__other__" className="text-slate-900">Other (type below)</option>
              </select>
              {(selectedSiteId === "__other__" || (!selectedSiteId && (form.site || form.siteId))) && (
                <Input
                  className="mt-2"
                  label="Site name (if other)"
                  value={form.site || form.siteId}
                  onChange={(e: any) => setForm({ ...form, site: e.target.value, siteId: e.target.value })}
                  placeholder="Site name or ID"
                />
              )}
            </div>

            <Input
              label="Scheduled At"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e: any) => setForm({ ...form, scheduledAt: e.target.value })}
            />

            <Input
              label="Notes"
              value={form.notes}
              onChange={(e: any) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes"
            />

            <Button onClick={handleSubmit} className="w-full">
              Save Delivery
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
