"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/app/dashboard/components/PageHeader";

export default function SuperuserSettingsClient() {
  const [brandName, setBrandName] = useState("SiteHub");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [featureA, setFeatureA] = useState(true);
  const [featureB, setFeatureB] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/global", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.resolve({})))
      .then((d: Record<string, unknown>) => {
        if (d?.brandName != null) setBrandName(String(d.brandName));
        if (d?.primaryColor != null) setPrimaryColor(String(d.primaryColor));
        if (d?.featureA != null) setFeatureA(!!d.featureA);
        if (d?.featureB != null) setFeatureB(!!d.featureB);
        if (d?.announcement != null) setAnnouncement(String(d.announcement));
        if (d?.maintenance != null) setMaintenance(!!d.maintenance);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ brandName, primaryColor, featureA, featureB, announcement, maintenance }),
      });
      if (res.ok) {
        alert("Global settings saved.");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to save. API may not be implemented yet.");
      }
    } catch (e: any) {
      alert("Failed to save: " + (e?.message || "Network error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader title="Global Settings" description="System-wide controls for all companies and users." />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader title="Global Settings" description="System-wide controls for all companies and users." />
      <div className="space-y-8">
        <section className="card">
          <h2 className="text-xl font-bold mb-4">Branding</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Brand Name</label>
              <input className="input w-full max-w-xs" value={brandName} onChange={e => setBrandName(e.target.value)} />
            </div>
            <div>
              <label className="block font-semibold mb-1">Primary Color</label>
              <input type="color" className="w-12 h-8 p-0 border-0" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
              <span className="ml-2">{primaryColor}</span>
            </div>
          </div>
        </section>
        <section className="card">
          <h2 className="text-xl font-bold mb-4">Feature Toggles</h2>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={featureA} onChange={e => setFeatureA(e.target.checked)} />
              Enable Feature A
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={featureB} onChange={e => setFeatureB(e.target.checked)} />
              Enable Feature B
            </label>
          </div>
        </section>
        <section className="card">
          <h2 className="text-xl font-bold mb-4">System-wide Announcements</h2>
          <textarea className="input w-full" rows={3} placeholder="Enter announcement..." value={announcement} onChange={e => setAnnouncement(e.target.value)} />
        </section>
        <section className="card">
          <h2 className="text-xl font-bold mb-4">Maintenance Mode</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={maintenance} onChange={e => setMaintenance(e.target.checked)} />
            Enable Maintenance Mode
          </label>
        </section>
        <div>
          <button className="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Global Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
