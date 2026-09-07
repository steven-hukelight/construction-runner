"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
 

import React, { useEffect, useState } from "react";
import { useTheme } from "@/app/ThemeProvider";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { supabase } from "@/supabase/auth/client";

// All settings subcomponents are now defined here instead of imported from page.tsx

interface SettingsComponentProps {
  saveSettings: (section: string, data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

function CompanySettings({ saveSettings, saving }: SettingsComponentProps) {
  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const [linkedCompanyId, setLinkedCompanyId] = useState<string | null>(null);
  const [linkedCompanyName, setLinkedCompanyName] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.companyId != null) setLinkedCompanyId(data.companyId);
        if (data.companyName != null) setLinkedCompanyName(data.companyName);
        if (data.companyId) {
          return fetch(`/api/company/${data.companyId}/inviteCode`).then((r) => r.json());
        }
      })
      .then((res) => {
        if (res?.inviteCode != null) setInviteCode(res.inviteCode);
      })
      .catch(() => {})
      .finally(() => {
        setMeLoading(false);
        setInviteCodeLoading(false);
      });
  }, []);

  const handleSave = () => {
    saveSettings("company", { companyName, regNumber, address, contactEmail });
  };
  async function handleRegenerate() {
    if (!linkedCompanyId) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/company/${linkedCompanyId}/regenerateInviteCode`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.inviteCode) setInviteCode(data.inviteCode);
      else alert(data.error || "Failed to regenerate code");
    } finally {
      setRegenLoading(false);
    }
  }
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Company Information</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Your linked company</label>
          {meLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : linkedCompanyId || linkedCompanyName ? (
            <p className="text-sm text-gray-900">
              You are registered to: <strong>{linkedCompanyName || linkedCompanyId || "—"}</strong>
              {linkedCompanyId && (
                <span className="text-gray-500 font-mono text-xs ml-2">({linkedCompanyId})</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No company linked to your account.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Invite Code</label>
          <p className="text-xs text-gray-500 mb-2">Share this code with new team members to join your company at registration.</p>
          <div className="flex items-center gap-2">
            {inviteCodeLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : inviteCode ? (
              <span className="font-mono bg-gray-100 px-3 py-1 rounded text-lg">{inviteCode}</span>
            ) : linkedCompanyId ? (
              <span className="text-gray-500">No invite code yet — click Regenerate to create one</span>
            ) : (
              <span className="text-gray-500">No company linked to your account.</span>
            )}
            {linkedCompanyId && (
              <button className="button" onClick={handleRegenerate} disabled={regenLoading}>
                {regenLoading ? "Regenerating..." : "Regenerate Invite Code"}
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
          <input 
            type="text" 
            className="input w-full" 
            placeholder="Your company name" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Registration Number</label>
          <input 
            type="text" 
            className="input w-full" 
            placeholder="12345678" 
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
          <textarea 
            className="input w-full" 
            rows={3} 
            placeholder="Company address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Email</label>
          <input 
            type="email" 
            className="input w-full" 
            placeholder="contact@company.com" 
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div className="pt-4 border-t">
          <button className="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountSettings({ saveSettings, saving }: SettingsComponentProps) {
  return (
    <div className="card">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Account Settings</h2>
      <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">Manage your account settings and preferences. For personal information like name, email, and phone, visit your Profile page.</p>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-2 sm:gap-0">
          <div>
            <h3 className="font-medium text-slate-900 mb-1">Account Status</h3>
            <p className="text-sm text-slate-500">Your account is active and in good standing</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active
          </span>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-medium text-slate-900 mb-3">Quick Links</h3>
          <div className="space-y-2">
            <a href="/dashboard/profile" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
              <span className="text-sm text-slate-700 group-hover:text-slate-900">Edit Profile Information</span>
              <span className="text-slate-400 group-hover:text-blue-600 transition-colors">→</span>
            </a>
            <a href="/dashboard/profile" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group">
              <span className="text-sm text-slate-700 group-hover:text-slate-900">View Activity Log</span>
              <span className="text-slate-400 group-hover:text-blue-600 transition-colors">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings({ saveSettings, saving }: SettingsComponentProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(true);
  const [regenLoading, setRegenLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const cid = d?.companyId;
        if (cid) {
          setCompanyId(cid);
          return fetch(`/api/company/${cid}/inviteCode`).then((r) => r.json());
        }
      })
      .then((res) => {
        if (res?.inviteCode != null) setInviteCode(res.inviteCode);
      })
      .catch(() => {})
      .finally(() => setInviteCodeLoading(false));
  }, []);
  async function handleRegenerate() {
    if (!companyId) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/company/${companyId}/regenerateInviteCode`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.inviteCode) setInviteCode(data.inviteCode);
      else alert(data.error || "Failed to regenerate code");
    } finally {
      setRegenLoading(false);
    }
  }
  return (
    <>
      <h2 className="text-xl font-bold text-slate-900 mb-6">Company Information</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Invite Code</label>
          <div className="flex items-center gap-2">
            {inviteCodeLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : inviteCode ? (
              <span className="font-mono bg-gray-100 px-3 py-1 rounded text-lg">{inviteCode}</span>
            ) : companyId ? (
              <span className="text-gray-500">No invite code yet — click Regenerate to create one</span>
            ) : (
              <span className="text-gray-500">No company linked</span>
            )}
            {companyId && (
              <button className="button" onClick={handleRegenerate} disabled={regenLoading}>
                {regenLoading ? "Regenerating..." : "Regenerate Invite Code"}
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
          <input 
            type="text" 
            className="input w-full" 
            placeholder="Your company name" 
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company Registration Number</label>
          <input 
            type="text" 
            className="input w-full" 
            placeholder="12345678" 
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
          <textarea 
            className="input w-full" 
            rows={3} 
            placeholder="Company address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Email</label>
          <input 
            type="email" 
            className="input w-full" 
            placeholder="contact@company.com" 
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div className="pt-4 border-t">
          <button className="button" onClick={() => {}} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

function SecuritySettings({ saveSettings, saving }: SettingsComponentProps) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Security Settings</h2>
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
            <div className="pt-2">
              <button className="button">Update Password</button>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all">Enable</button>
          </div>
        </div>
        <div className="pt-6 border-t border-gray-100">
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

function DisplaySettings({ saveSettings, saving }: SettingsComponentProps) {
  const { theme, setTheme } = useTheme();
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [timeFormat, setTimeFormat] = useState("24 Hour");
  const [language, setLanguage] = useState("English (UK)");
  const handleSave = () => {
    saveSettings("display", { dateFormat, timeFormat, language });
  };
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Display Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="font-semibold text-slate-900">Theme</p>
            <p className="text-sm text-slate-600">Choose light or dark theme</p>
          </div>
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Light</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Dark</span>
            </label>
          </div>
        </div>
        <div className="py-3 border-b">
          <label className="block font-semibold text-gray-900 mb-2">Date Format</label>
          <select 
            className="input w-full max-w-xs"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>
        <div className="py-3 border-b">
          <label className="block font-semibold text-gray-900 mb-2">Time Format</label>
          <select 
            className="input w-full max-w-xs"
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value)}
          >
            <option>24 Hour</option>
            <option>12 Hour (AM/PM)</option>
          </select>
        </div>
        <div className="py-3 border-b">
          <label className="block font-semibold text-gray-900 mb-2">Language</label>
          <select 
            className="input w-full max-w-xs"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>English (UK)</option>
            <option>English (US)</option>
          </select>
        </div>
        <div className="pt-6 border-t border-gray-100">
          <button 
            className="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DataPrivacySettings({ saveSettings, saving }: SettingsComponentProps) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Data & Privacy</h2>
      <div className="space-y-6">
        <div className="py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">Export Your Data</h3>
          <p className="text-sm text-gray-600 mb-4">Download a copy of your data including sites, RAMS, and user information</p>
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all">Export Data</button>
        </div>
        <div className="py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-2">Data Retention</h3>
          <p className="text-sm text-gray-600 mb-4">Configure how long data is retained in the system</p>
          <select className="input w-full max-w-xs">
            <option>30 days</option>
            <option>90 days</option>
            <option>1 year</option>
            <option>Forever</option>
          </select>
        </div>
        <div className="py-4 border-t border-gray-100">
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

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState("account");
  const [saving, setSaving] = useState(false);
  
  type SaveSettings = (section: string, data: Record<string, unknown>) => Promise<void>;
  async function saveSettings(section: string, data: Record<string, unknown>) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        alert("No user found. Please log in again.");
        return;
      }

      const res = await fetch("/api/settings/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, config: data }),
      });

      if (!res.ok) throw new Error("Failed to save");
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "account", label: "Account", icon: "👤" },
    { id: "company", label: "Company", icon: "🏢" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "display", label: "Display", icon: "🎨" },
    { id: "data", label: "Data & Privacy", icon: "📊" },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="card">
            <div className="flex md:block overflow-x-auto md:overflow-visible gap-2 md:gap-0 pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl text-left transition-all mb-0 md:mb-2 last:mb-0 whitespace-nowrap md:whitespace-normal ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#58a5f0] to-[#2d8ae8] shadow-lg shadow-blue-500/20"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                style={activeTab === tab.id ? { color: '#ffffff' } : {}}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === "account" && <AccountSettings saveSettings={saveSettings} saving={saving} />}
          {activeTab === "company" && <CompanySettings saveSettings={saveSettings} saving={saving} />}
          {activeTab === "notifications" && <NotificationSettings saveSettings={saveSettings} saving={saving} />}
          {activeTab === "security" && <SecuritySettings saveSettings={saveSettings} saving={saving} />}
          {activeTab === "display" && <DisplaySettings saveSettings={saveSettings} saving={saving} />}
          {activeTab === "data" && <DataPrivacySettings saveSettings={saveSettings} saving={saving} />}
        </div>
      </div>
    </>
  );
}

// ...existing AccountSettings, CompanySettings, NotificationSettings, SecuritySettings, DisplaySettings, DataPrivacySettings components can be moved here or imported if needed.
