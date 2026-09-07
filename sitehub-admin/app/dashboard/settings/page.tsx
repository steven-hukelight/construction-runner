
"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent } from "react";
import PageHeader from "../components/PageHeader";
import { useTheme } from "@/app/ThemeProvider";
import { useDisplayPreferences, formatDate, formatTime, formatDateTime } from "@/app/DisplayPreferencesProvider";
import { User, Building2, Bell, Shield, Palette, Database, Mail } from "lucide-react";

export default function SettingsPage() {
  const activeTabDefault = "personal";
  const [activeTab, setActiveTab] = useState(activeTabDefault);

  const tabs = [
    { id: "personal", label: "Personal Information", icon: User },
    { id: "company", label: "Company", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "display", label: "Display", icon: Palette },
    { id: "data", label: "Data & Privacy", icon: Database },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="space-y-6">
        {/* Selection bar (same layout as Safety) */}
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-600"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div>
          {activeTab === "personal" && <PersonalInformationSettings />}
          {activeTab === "company" && <CompanySettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "display" && <DisplaySettings />}
          {activeTab === "data" && <DataPrivacySettings />}
        </div>
      </div>
    </>
  );
}

function PersonalInformationSettings() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
      <p className="text-sm text-gray-600 mb-6">
        Edit your name, email, phone, address, emergency contact, NI number, and other personal details in your Profile.
        This is the single place for your account details — used across the app.
      </p>
      <a
        href="/dashboard/profile"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Open Profile →
      </a>
    </div>
  );
}

function CompanySettings() {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const cid = d?.companyId;
        if (cid) {
          setCompanyId(cid);
          return Promise.all([
            fetch(`/api/companies/${cid}`).then((r) => r.json()),
            fetch(`/api/company/${cid}/inviteCode`).then((r) => r.json()),
          ]);
        }
      })
      .then((results) => {
        if (results) {
          const [company, inviteRes] = results;
          if (company?.name != null) setCompanyName(String(company.name));
          const addr = (company as { address?: string | null })?.address;
          setCompanyAddress(typeof addr === "string" ? addr : "");
          const lu = company?.logoUrl ?? company?.logo_url;
          if (lu) setLogoUrl(String(lu));
          else setLogoUrl(null);
          setInviteCode(inviteRes?.inviteCode ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setInviteCodeLoading(false));
  }, []);

  async function handleSaveCompanyDetails() {
    if (!companyId) return;
    const trimmedName = companyName.trim();
    const trimmedAddress = companyAddress.trim();
    if (!trimmedName) {
      alert("Company name is required.");
      return;
    }
    if (!trimmedAddress) {
      alert("Company address is required. Enter the full registered or principal address.");
      return;
    }
    setNameSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmedName, address: trimmedAddress }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data?.error === "string" ? data.error : "Could not update company details");
        return;
      }
      setCompanyName(trimmedName);
      setCompanyAddress(trimmedAddress);
      alert("Company details saved.");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !companyId) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/companies/${companyId}/logo`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.logoUrl) setLogoUrl(data.logoUrl);
      else alert(data.error || "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!companyId || !logoUrl) return;
    if (!window.confirm("Remove the company logo? You can upload a new one anytime.")) return;
    setLogoRemoving(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/logo`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setLogoUrl(null);
      else alert(typeof data?.error === "string" ? data.error : "Could not remove logo");
    } finally {
      setLogoRemoving(false);
    }
  }

  async function handleRegenerate() {
    if (!companyId) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/company/${companyId}/regenerateInviteCode`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.inviteCode) {
        setInviteCode(data.inviteCode);
      } else {
        alert(data.error || "Failed to regenerate code");
      }
    } finally {
      setRegenLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Company Information</h2>
      <div className="space-y-6">
        {companyId && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Company name <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                Shown across the app where your organisation is identified.
              </p>
              <input
                type="text"
                className="input w-full"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                disabled={nameSaving}
                autoComplete="organization"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Company address <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                Registered or principal trading address (required for records and compliance).
              </p>
              <textarea
                className="input w-full min-h-[100px] py-2.5 resize-y"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Building, street, town, postcode, country"
                disabled={nameSaving}
                rows={4}
                autoComplete="street-address"
              />
            </div>
            <button
              type="button"
              className="button"
              onClick={() => void handleSaveCompanyDetails()}
              disabled={nameSaving || !companyName.trim() || !companyAddress.trim()}
            >
              {nameSaving ? "Saving…" : "Save company details"}
            </button>
          </div>
        )}
        {/* Company Logo - for RAMS & Briefing PDFs */}
        {companyId && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Company logo</label>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Used on RAMS and Briefing documents. PNG, JPEG, or WebP.</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Company logo" fill className="object-contain p-1" sizes="80px" unoptimized />
                ) : (
                  <span className="text-gray-400 dark:text-slate-500 text-xs px-1 text-center">No logo</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  id="company-logo"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading || logoRemoving}
                />
                <label
                  htmlFor="company-logo"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    logoUploading || logoRemoving
                      ? "bg-gray-200 dark:bg-slate-600 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                </label>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    !logoUrl || logoUploading || logoRemoving
                      ? "border-gray-200 dark:border-slate-600 text-gray-400 cursor-not-allowed"
                      : "border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  }`}
                  onClick={handleRemoveLogo}
                  disabled={!logoUrl || logoUploading || logoRemoving}
                >
                  {logoRemoving ? "Removing…" : "Remove logo"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Invite Code</label>
          <p className="text-xs text-gray-500 mb-2">Share this code with new team members to join your company at registration.</p>
          <div className="flex items-center gap-2">
            {inviteCodeLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : inviteCode ? (
              <span className="font-mono bg-gray-100 px-3 py-1 rounded text-lg">{inviteCode}</span>
            ) : companyId ? (
              <span className="text-gray-500">No invite code yet — click Regenerate to create one</span>
            ) : (
              <span className="text-gray-500">Sign in with a company to view your invite code</span>
            )}
            {companyId && (
              <button className="button" onClick={handleRegenerate} disabled={regenLoading}>
                {regenLoading ? "Regenerating..." : "Regenerate Invite Code"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [operativePendingApproval, setOperativePendingApproval] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isManager = (() => {
    const r = (role ?? "").toLowerCase();
    return r === "admin" || r === "supervisor" || r === "sub_admin";
  })();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRole(typeof data.role === "string" ? data.role : null);
        const p = data.emailNotificationPreferences;
        if (p && typeof p.operativePendingApproval === "boolean") {
          setOperativePendingApproval(p.operativePendingApproval);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveEmailPrefs() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/me/email-notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ operativePendingApproval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      if (typeof data.operativePendingApproval === "boolean") {
        setOperativePendingApproval(data.operativePendingApproval);
      }
    } catch {
      setSaveError("Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">New Health &amp; Safety Documents</p>
            <p className="text-sm text-gray-600">Get notified when new RAMS or briefings are uploaded</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">Task Assignments</p>
            <p className="text-sm text-gray-600">Receive alerts when tasks are assigned to you</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">Attendance Updates</p>
            <p className="text-sm text-gray-600">Get updates on operative attendance</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">Safety alerts</p>
            <p className="text-sm text-gray-600">Critical alerts from Safety → Alerts (push when published)</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
        </div>

        {isManager && (
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-3 border-b border-blue-100 bg-blue-50/50 -mx-2 px-2 rounded-lg">
            <div className="flex gap-3 min-w-0">
              <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="font-semibold text-gray-900">Operative pending approval (email)</p>
                <p className="text-sm text-gray-600">
                  Email when a new operative registers and needs approval. A copy also goes to info@construction-runner.com.
                  Requires the platform email toggle in Global settings.
                </p>
                {saveError && (
                  <p className="text-sm text-red-600 mt-2" role="alert">
                    {saveError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={operativePendingApproval}
                onChange={(e) => setOperativePendingApproval(e.target.checked)}
                disabled={loading}
                title="Receive email when an operative is pending approval"
                aria-label="Email me when an operative registration is pending approval"
              />
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                onClick={() => void handleSaveEmailPrefs()}
                disabled={saving || loading}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">Email Digest</p>
            <p className="text-sm text-gray-600">Weekly summary of site activity</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
        </div>
        <div className="pt-4 border-t">
          <button type="button" className="button">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

const DASHBOARD_BG_MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function normalizeDashboardBackgroundUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("data:")) {
    if (!/^data:image\/(png|jpeg|pjpeg|jpg|gif|webp);base64,/i.test(t)) return null;
    if (t.length > 2_200_000) return null;
    return t;
  }
  try {
    const u = new URL(t);
    const okHttpLocal =
      u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    if (u.protocol !== "https:" && !okHttpLocal) return null;
    return t;
  } catch {
    return null;
  }
}

function DisplaySettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const {
    dateFormat,
    timeFormat,
    tableDensity,
    setDateFormat,
    setTimeFormat,
    setTableDensity,
    dashboardBackgroundImageUrl,
    dashboardBackgroundBlur,
    dashboardBackgroundOverlay,
    setDashboardBackgroundImageUrl,
    setDashboardBackgroundBlur,
    setDashboardBackgroundOverlay,
  } = useDisplayPreferences();

  const [bgUrlError, setBgUrlError] = useState<string | null>(null);

  function commitBgUrlFromField() {
    const raw = dashboardBackgroundImageUrl ?? "";
    if (!raw.trim()) {
      setBgUrlError(null);
      setDashboardBackgroundImageUrl(null);
      return;
    }
    const normalized = normalizeDashboardBackgroundUrl(raw);
    if (!normalized) {
      setBgUrlError("Enter a valid https image URL, or use Upload. Localhost http is allowed for dev.");
      setDashboardBackgroundImageUrl(null);
      return;
    }
    setBgUrlError(null);
    setDashboardBackgroundImageUrl(normalized);
  }

  function onBgFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setBgUrlError("Please choose an image file (PNG, JPEG, WebP, or GIF).");
      return;
    }
    if (f.size > DASHBOARD_BG_MAX_FILE_BYTES) {
      setBgUrlError("Image must be 1.5MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const s = typeof reader.result === "string" ? reader.result : "";
      const n = normalizeDashboardBackgroundUrl(s);
      if (!n) {
        setBgUrlError("Could not use this image.");
        return;
      }
      setBgUrlError(null);
      setDashboardBackgroundImageUrl(n);
    };
    reader.readAsDataURL(f);
  }

  const previewUrl = dashboardBackgroundImageUrl?.trim() ?? "";

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Display Preferences</h2>
      <div className="space-y-6">
        <div className="py-4 border-b border-gray-200 dark:border-slate-600 space-y-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">Dashboard background</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Optional image behind the main column only (sidebar unchanged). Upload a PNG or JPEG from your
              computer, or paste a direct image link. Blur keeps the same soft, readable look as the default
              gradient.
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                Upload image
              </label>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                PNG, JPEG, WebP, or GIF — max 1.5&nbsp;MB. Stored in this browser only.
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-2 leading-relaxed">
                <span className="font-semibold text-gray-600 dark:text-slate-400">Suggested size:</span> about{" "}
                <strong>1920 × 1080 px</strong> (landscape), or any wide photo with a similar aspect ratio. The
                image is scaled to fill the main area and blurred, so you don’t need 4K — but very small images
                (under ~1280&nbsp;px wide) can look soft or pixelated after blur.
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={onBgFile}
                className="hidden"
                id="dashboard-bg-file"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="dashboard-bg-file"
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Choose file…
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setBgUrlError(null);
                    setDashboardBackgroundImageUrl(null);
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear background
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                Or image URL
              </label>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                Direct <code className="text-xs bg-gray-100 dark:bg-slate-800 px-1 rounded">https://</code> link
                to a PNG or JPEG (e.g. from Supabase storage or your CDN).
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={dashboardBackgroundImageUrl ?? ""}
                  onChange={(e) => {
                    setBgUrlError(null);
                    const v = e.target.value;
                    setDashboardBackgroundImageUrl(v === "" ? null : v);
                  }}
                  onBlur={() => commitBgUrlFromField()}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => commitBgUrlFromField()}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  Apply URL
                </button>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={dashboardBackgroundBlur}
                onChange={(e) => setDashboardBackgroundBlur(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              Blur background image
            </label>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                Frost / overlay strength: {Math.round(dashboardBackgroundOverlay * 100)}%
              </label>
              <input
                type="range"
                min={35}
                max={92}
                value={Math.round(dashboardBackgroundOverlay * 100)}
                onChange={(e) => setDashboardBackgroundOverlay(Number(e.target.value) / 100)}
                className="w-full max-w-md accent-blue-600"
              />
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Higher = more wash over the photo (easier to read text).
              </p>
            </div>
            {bgUrlError && <p className="text-sm text-red-600 dark:text-red-400">{bgUrlError}</p>}
            {previewUrl ? (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Preview</p>
                <div className="relative h-28 max-w-md rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
                  <div
                    className="absolute inset-[-15%] bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${previewUrl})`,
                      filter: dashboardBackgroundBlur ? "blur(14px)" : "none",
                      transform: "scale(1.05)",
                    }}
                  />
                  <div
                    className="absolute inset-0 backdrop-blur-[0.5px]"
                    style={{
                      backgroundColor:
                        resolvedTheme === "dark"
                          ? `rgba(15, 23, 42, ${dashboardBackgroundOverlay})`
                          : `rgba(255, 255, 255, ${dashboardBackgroundOverlay})`,
                    }}
                  />
                  <div className="relative z-[1] flex items-center justify-center h-full text-xs font-medium text-slate-700 dark:text-slate-200 px-3 text-center">
                    Main column will look like this behind cards and tables
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-gray-200 dark:border-slate-600">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">Theme</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Follow system, or choose light or dark</p>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            {(["light", "dark", "system"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-gray-200 dark:border-slate-600">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">Date format</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">How dates are shown across the app</p>
          </div>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as "ddmmyyyy" | "mmddyyyy")}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ddmmyyyy">DD/MM/YYYY (e.g. 06/03/2025)</option>
            <option value="mmddyyyy">MM/DD/YYYY (e.g. 03/06/2025)</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4 border-b border-gray-200 dark:border-slate-600">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">Time format</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">12-hour or 24-hour clock</p>
          </div>
          <select
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value as "12h" | "24h")}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="24h">24-hour (e.g. 14:30)</option>
            <option value="12h">12-hour (e.g. 2:30 PM)</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">Table density</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Font size and row spacing in tables</p>
          </div>
          <select
            value={tableDensity}
            onChange={(e) => setTableDensity(e.target.value as "compact" | "comfortable" | "spacious")}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-600">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Preview</p>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Date: {formatDate(new Date())} · Time: {formatTime(new Date())} · Full: {formatDateTime(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
              <input type="password" className="input w-full" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <input type="password" className="input w-full" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
              <input type="password" className="input w-full" placeholder="••••••••" />
            </div>
            <button className="button">Update Password</button>
          </div>
        </div>
        <div className="pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <button className="button ghost">Enable</button>
          </div>
        </div>
        <div className="pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Session Timeout</p>
              <p className="text-sm text-gray-600">Auto logout after inactivity</p>
            </div>
            <select className="input">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>Never</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataPrivacySettings() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Data & Privacy</h2>
      <div className="space-y-6">
        <div className="py-4 border-b">
          <h3 className="font-semibold text-gray-900 mb-2">Export Your Data</h3>
          <p className="text-sm text-gray-600 mb-4">Download a copy of your data including sites, Health & Safety documents, and user information</p>
          <button className="button ghost">Export Data</button>
        </div>
        <div className="py-4 border-b">
          <h3 className="font-semibold text-gray-900 mb-2">Data Retention</h3>
          <p className="text-sm text-gray-600 mb-4">Configure how long data is retained in the system</p>
          <select className="input w-full max-w-xs">
            <option>30 days</option>
            <option>90 days</option>
            <option>1 year</option>
            <option>Forever</option>
          </select>
        </div>
        <div className="py-4 border-b">
          <h3 className="font-semibold text-red-600 mb-2">Delete Account</h3>
          <p className="text-sm text-gray-600 mb-4">Permanently delete your account and all associated data</p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
