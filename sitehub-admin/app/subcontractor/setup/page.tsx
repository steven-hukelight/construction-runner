"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, UserPlus, FileUp, Users, ArrowRight } from "lucide-react";

type LinkedSite = { id: string; name?: string };
type Operative = { id: string; name?: string; phone?: string };

export default function SubcontractorSetupPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [linkedSites, setLinkedSites] = useState<LinkedSite[]>([]);
  const [operatives, setOperatives] = useState<Operative[]>([]);
  const [assignedOperatives, setAssignedOperatives] = useState<Record<string, string[]>>({});
  const [newOperativeName, setNewOperativeName] = useState("");
  const [newOperativePhone, setNewOperativePhone] = useState("");
  const [ramsSiteId, setRamsSiteId] = useState("");
  const [ramsFile, setRamsFile] = useState<File | null>(null);
  const [assignSiteId, setAssignSiteId] = useState("");
  const [assignOperativeId, setAssignOperativeId] = useState("");

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.companyId) {
          setCompanyId(data.companyId);
          setCompanyName(data.companyName ?? "");
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/companies/${companyId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.name !== undefined) setCompanyName(data.name ?? "");
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl ?? "");
      });
    fetch("/api/sites/linked", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setLinkedSites(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length && !ramsSiteId) setRamsSiteId(data[0].id ?? "");
        if (Array.isArray(data) && data.length && !assignSiteId) setAssignSiteId(data[0].id ?? "");
      });
    fetch(`/api/companies/${companyId}/operatives`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setOperatives(Array.isArray(data) ? data : []));
  }, [companyId, assignSiteId, ramsSiteId]);

  useEffect(() => {
    if (!companyId || linkedSites.length === 0) return;
    linkedSites.forEach((site) => {
      fetch(`/api/sites/${site.id}/assigned-operatives`, { credentials: "include" })
        .then((r) => r.json())
        .then((list) => {
          const ids: string[] = Array.isArray(list)
            ? list.map((a: { operativeId?: string }) => a.operativeId).filter((id): id is string => Boolean(id))
            : [];
          setAssignedOperatives((prev) => ({ ...prev, [site.id]: ids }));
        });
    });
  }, [companyId, linkedSites]);

  async function saveCompany() {
    if (!companyId) return;
    setSavingCompany(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName, logoUrl: logoUrl || null }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save");
    } finally {
      setSavingCompany(false);
    }
  }

  async function addOperative() {
    if (!companyId || !newOperativeName.trim()) return;
    const res = await fetch(`/api/companies/${companyId}/operatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOperativeName.trim(), phone: newOperativePhone.trim() || undefined }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok && data.id) {
      setOperatives((prev) => [...prev, { id: data.id, name: newOperativeName.trim(), phone: newOperativePhone.trim() || undefined }]);
      setNewOperativeName("");
      setNewOperativePhone("");
    } else {
      alert(data?.error ?? "Failed to add operative");
    }
  }

  async function assignOperative() {
    if (!assignSiteId || !assignOperativeId || !companyId) return;
    const res = await fetch(`/api/sites/${assignSiteId}/assigned-operatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operativeId: assignOperativeId, companyId }),
      credentials: "include",
    });
    if (res.ok) {
      setAssignedOperatives((prev) => ({
        ...prev,
        [assignSiteId]: [...(prev[assignSiteId] ?? []), assignOperativeId],
      }));
    } else {
      const data = await res.json();
      alert(data?.error ?? "Failed to assign");
    }
  }

  async function uploadRAMS() {
    if (!ramsSiteId || !ramsFile) {
      alert("Select a site and a file.");
      return;
    }
    const form = new FormData();
    form.append("file", ramsFile);
    form.append("siteId", ramsSiteId);
    form.append("uploadedBy", "subcontractor");
    const res = await fetch("/api/rams/upload", { method: "POST", body: form, credentials: "include" });
    if (res.ok) {
      setRamsFile(null);
      alert("RAMS uploaded. It will be reviewed by the main contractor.");
    } else {
      alert("Upload failed.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">You need to be signed in as a subcontractor.</p>
        <Link href="/login" className="text-blue-600 font-medium hover:underline">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subcontractor setup</h1>
            <p className="text-sm text-gray-500">Complete your company profile and assign operatives to the site.</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Go to dashboard <ArrowRight size={16} />
        </Link>
      </div>

      <div className="space-y-8">
        {/* Company name & logo */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            Company details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (optional)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
              {logoUrl && (
                <div className="mt-2 h-12 w-12 relative rounded-lg overflow-hidden bg-gray-100">
                  <Image src={logoUrl} alt="" fill className="object-contain" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={saveCompany}
              disabled={savingCompany}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {savingCompany ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        {/* Add operatives */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Add operatives
          </h2>
          <div className="space-y-3 flex flex-wrap gap-3 items-end">
            <input
              type="text"
              value={newOperativeName}
              onChange={(e) => setNewOperativeName(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 flex-1 min-w-[140px]"
              placeholder="Name"
            />
            <input
              type="text"
              value={newOperativePhone}
              onChange={(e) => setNewOperativePhone(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 flex-1 min-w-[140px]"
              placeholder="Phone (optional)"
            />
            <button
              type="button"
              onClick={addOperative}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          {operatives.length > 0 && (
            <ul className="mt-4 space-y-2">
              {operatives.map((op) => (
                <li key={op.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <Users size={16} className="text-gray-400" />
                  {op.name} {op.phone && `· ${op.phone}`}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upload RAMS */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileUp size={20} className="text-blue-600" />
            Upload RAMS
          </h2>
          {linkedSites.length === 0 ? (
            <p className="text-gray-500 text-sm">No linked site yet. Use the invite code from the main contractor.</p>
          ) : (
            <div className="space-y-3">
              <select
                value={ramsSiteId}
                onChange={(e) => setRamsSiteId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                {linkedSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.id}</option>
                ))}
              </select>
              <input
                type="file"
                onChange={(e) => setRamsFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600"
              />
              <button
                type="button"
                onClick={uploadRAMS}
                disabled={!ramsFile}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          )}
        </section>

        {/* Assign operatives to site */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Assign operatives to site
          </h2>
          {linkedSites.length === 0 ? (
            <p className="text-gray-500 text-sm">No linked site.</p>
          ) : operatives.length === 0 ? (
            <p className="text-gray-500 text-sm">Add operatives first.</p>
          ) : (
            <div className="space-y-3">
              <select
                value={assignSiteId}
                onChange={(e) => setAssignSiteId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                {linkedSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.id}</option>
                ))}
              </select>
              <select
                value={assignOperativeId}
                onChange={(e) => setAssignOperativeId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select operative</option>
                {operatives.map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={assignOperative}
                disabled={!assignOperativeId}
                className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Assign to site
              </button>
              {linkedSites.map((site) => {
                const ids = assignedOperatives[site.id] ?? [];
                if (ids.length === 0) return null;
                return (
                  <div key={site.id} className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700">{site.name || site.id}</p>
                    <p className="text-xs text-gray-500">
                      Assigned: {ids.map((id) => operatives.find((o) => o.id === id)?.name ?? id).join(", ")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-500 mt-8">
          By continuing, you agree to Construction Runner&apos;s{" "}
          <a href="/legal/privacy-and-security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Privacy & Security Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
