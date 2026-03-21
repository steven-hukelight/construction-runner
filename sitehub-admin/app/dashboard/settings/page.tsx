
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useTheme } from "@/app/ThemeProvider";
import { useDisplayPreferences, formatDate, formatTime, formatDateTime } from "@/app/DisplayPreferencesProvider";

export default function SettingsPage() {
  const activeTabDefault = "personal";
  const [activeTab, setActiveTab] = useState(activeTabDefault);

  const tabs = [
    { id: "personal", label: "Personal Information", icon: "👤" },
    { id: "company", label: "Company", icon: "🏢" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "display", label: "Display", icon: "🎨" },
    { id: "data", label: "Data & Privacy", icon: "📊" },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] text-white font-medium shadow-lg"
                    : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

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
          if (company?.logoUrl) setLogoUrl(company.logoUrl);
          setInviteCode(inviteRes?.inviteCode ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setInviteCodeLoading(false));
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
      <h2 className="text-xl font-bold text-gray-900 mb-6">Company Information</h2>
      <div className="space-y-6">
        {/* Company Logo - for RAMS & Briefing PDFs */}
        {companyId && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Company Logo</label>
            <p className="text-xs text-gray-500 mb-2">Used on RAMS and Briefing documents. PNG, JPEG, or WebP.</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Company logo" fill className="object-contain" sizes="80px" />
                ) : (
                  <span className="text-gray-400 text-xs">No logo</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="company-logo"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                />
                <label
                  htmlFor="company-logo"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    logoUploading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {logoUploading ? "Uploading…" : "Upload Logo"}
                </label>
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
        <div className="pt-4 border-t">
          <button className="button">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">New Health & Safety Documents</p>
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
            <p className="font-semibold text-gray-900">Site Notices</p>
            <p className="text-sm text-gray-600">Receive notifications for site announcements</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
        </div>
        <div className="flex items-center justify-between py-3 border-b">
          <div>
            <p className="font-semibold text-gray-900">Email Digest</p>
            <p className="text-sm text-gray-600">Weekly summary of site activity</p>
          </div>
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
        </div>
        <div className="pt-4 border-t">
          <button className="button">Save Preferences</button>
        </div>
      </div>
    </div>
  );
}

function DisplaySettings() {
  const { theme, setTheme } = useTheme();
  const { dateFormat, timeFormat, tableDensity, setDateFormat, setTimeFormat, setTableDensity } =
    useDisplayPreferences();

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Display Preferences</h2>
      <div className="space-y-6">
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
