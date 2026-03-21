"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import { Palette, ToggleLeft, Megaphone, Shield, Clock, Key, ShieldCheck, History, Sparkles, MessageSquare, Package, WifiOff, Award, ExternalLink } from "lucide-react";

export default function GlobalSettingsPage() {
  const [branding, setBranding] = useState({ appName: "Construction Runner", supportEmail: "" });
  const [featureToggles, setFeatureToggles] = useState({ registrationsOpen: true, maintenanceMode: false });
  const [announcement, setAnnouncement] = useState("");
  const [security, setSecurity] = useState({
    sessionTimeoutMinutes: 60,
    passwordMinLength: 8,
    requirePasswordExpiry: false,
    passwordExpiryDays: 90,
    twoFactorEnabled: false,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    auditLogRetentionDays: 90,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/global", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const b = data.branding ?? {};
        setBranding({
          appName: b.appName ?? data.appName ?? data.brandName ?? "Construction Runner",
          supportEmail: b.supportEmail ?? data.supportEmail ?? "",
        });
        const ft = data.featureToggles ?? {};
        setFeatureToggles({
          registrationsOpen: ft.registrationsOpen ?? data.registrationsOpen ?? data.featureA ?? true,
          maintenanceMode: ft.maintenanceMode ?? data.maintenanceMode ?? data.maintenance ?? false,
        });
        setAnnouncement(data.announcement ?? data.announcements?.message ?? "");
        const sec = data.security ?? {};
        setSecurity((s) => ({
          ...s,
          ...(typeof sec.sessionTimeoutMinutes === "number" && { sessionTimeoutMinutes: sec.sessionTimeoutMinutes }),
          ...(typeof sec.passwordMinLength === "number" && { passwordMinLength: sec.passwordMinLength }),
          ...(typeof sec.requirePasswordExpiry === "boolean" && { requirePasswordExpiry: sec.requirePasswordExpiry }),
          ...(typeof sec.passwordExpiryDays === "number" && { passwordExpiryDays: sec.passwordExpiryDays }),
          ...(typeof sec.twoFactorEnabled === "boolean" && { twoFactorEnabled: sec.twoFactorEnabled }),
          ...(typeof sec.maxLoginAttempts === "number" && { maxLoginAttempts: sec.maxLoginAttempts }),
          ...(typeof sec.lockoutMinutes === "number" && { lockoutMinutes: sec.lockoutMinutes }),
          ...(typeof sec.auditLogRetentionDays === "number" && { auditLogRetentionDays: sec.auditLogRetentionDays }),
        }));
      })
      .catch(() => {});
  }, []);

  async function handleSave(section: string) {
    setSaving(section);
    setSaveError(null);
    try {
      let res: Response;
      let body: Record<string, unknown>;
      if (section === "branding") {
        body = { section: "branding", config: { appName: branding.appName, supportEmail: branding.supportEmail } };
        res = await fetch("/api/settings/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } else if (section === "toggles") {
        body = { section: "featureToggles", config: featureToggles };
        res = await fetch("/api/settings/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } else if (section === "announcements") {
        body = { section: "announcements", config: { message: announcement } };
        res = await fetch("/api/settings/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } else if (section === "security") {
        body = { section: "security", config: security };
        res = await fetch("/api/settings/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } else {
        setSaving(null);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error ?? (res.status === 403 ? "Access denied. Log in as superuser." : "Failed to save");
        setSaveError(msg);
      } else {
        setSaveError(null);
      }
    } catch {
      setSaveError("Failed to save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="relative space-y-8">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />

      <PageHeader
        title="Global settings"
        description="Platform-wide configuration. Changes apply across all tenants."
      />

      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Palette className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Branding</h3>
              <p className="text-sm text-gray-600">App name and support contact</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">App name</label>
              <input
                type="text"
                value={branding.appName}
                onChange={(e) => setBranding((p) => ({ ...p, appName: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support email</label>
              <input
                type="email"
                value={branding.supportEmail}
                onChange={(e) => setBranding((p) => ({ ...p, supportEmail: e.target.value }))}
                className="input w-full"
                placeholder="support@example.com"
              />
            </div>
            <Button size="sm" onClick={() => handleSave("branding")} disabled={saving === "branding"}>
              {saving === "branding" ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <ToggleLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Feature toggles</h3>
              <p className="text-sm text-gray-600">Enable or disable platform features</p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={featureToggles.registrationsOpen}
                onChange={(e) =>
                  setFeatureToggles((p) => ({ ...p, registrationsOpen: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Registrations open</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={featureToggles.maintenanceMode}
                onChange={(e) =>
                  setFeatureToggles((p) => ({ ...p, maintenanceMode: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Maintenance mode</span>
            </label>
            <Button size="sm" onClick={() => handleSave("toggles")} disabled={saving === "toggles"}>
              {saving === "toggles" ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Megaphone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System-wide announcements</h3>
              <p className="text-sm text-gray-600">Banner or notice for all users</p>
            </div>
          </div>
          <div className="space-y-4">
            <textarea
              className="input w-full min-h-[100px]"
              placeholder="No announcement set. Add a message to show to all users."
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
            />
            <Button size="sm" onClick={() => handleSave("announcements")} disabled={saving === "announcements"}>
              {saving === "announcements" ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security & access</h3>
              <p className="text-sm text-gray-600">Session, password policy, 2FA, and audit settings</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            <div className="space-y-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/40">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Session
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session timeout (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={security.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, sessionTimeoutMinutes: parseInt(e.target.value, 10) || 60 }))
                  }
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Auto logout after inactivity. Supabase Auth handles token expiry.</p>
              </div>
            </div>
            <div className="space-y-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/40">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                Password policy
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum length</label>
                <input
                  type="number"
                  min={6}
                  max={32}
                  value={security.passwordMinLength}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, passwordMinLength: parseInt(e.target.value, 10) || 8 }))
                  }
                  className="input w-full"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={security.requirePasswordExpiry}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, requirePasswordExpiry: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">Require password change every N days</span>
              </label>
              {security.requirePasswordExpiry && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (days)</label>
                  <input
                    type="number"
                    min={30}
                    max={365}
                    value={security.passwordExpiryDays}
                    onChange={(e) =>
                      setSecurity((p) => ({ ...p, passwordExpiryDays: parseInt(e.target.value, 10) || 90 }))
                    }
                    className="input w-full"
                  />
                </div>
              )}
            </div>
            <div className="space-y-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/40">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Login protection
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max failed attempts before lockout</label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={security.maxLoginAttempts}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, maxLoginAttempts: parseInt(e.target.value, 10) || 5 }))
                  }
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lockout duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={security.lockoutMinutes}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, lockoutMinutes: parseInt(e.target.value, 10) || 15 }))
                  }
                  className="input w-full"
                />
              </div>
              <p className="text-xs text-gray-500">Enforce via Supabase Auth or your login flow.</p>
            </div>
            <div className="space-y-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/40">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Two-factor authentication (2FA)
              </h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={security.twoFactorEnabled}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, twoFactorEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">Allow 2FA for admin users</span>
              </label>
              <p className="text-xs text-gray-500">Enable in Supabase Auth (Phone or Authenticator app) and surface in profile.</p>
            </div>
            <div className="space-y-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/40 md:col-span-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Audit & compliance
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audit log retention (days)</label>
                <input
                  type="number"
                  min={30}
                  max={365}
                  value={security.auditLogRetentionDays}
                  onChange={(e) =>
                    setSecurity((p) => ({ ...p, auditLogRetentionDays: parseInt(e.target.value, 10) || 90 }))
                  }
                  className="input w-full max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">How long to keep activity logs. System Logs page shows recent events.</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Button size="sm" onClick={() => handleSave("security")} disabled={saving === "security"}>
              {saving === "security" ? "Saving…" : "Save security settings"}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              These set defaults; implement enforcement in login flow and Supabase Auth where needed.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/40">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Modules</h3>
            <p className="text-sm text-gray-600">Messaging, assets, offline sync, and operative qualifications — all active.</p>
          </div>
        </div>
        <ul className="space-y-3">
          <li className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50/80 border border-emerald-100">
            <div className="flex items-center gap-3 min-w-0">
              <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Messaging</span>
                <p className="text-xs text-gray-500">In-app messaging between users and teams.</p>
              </div>
            </div>
            <Link href="/dashboard/messaging" className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Open <ExternalLink size={14} />
            </Link>
          </li>
          <li className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50/80 border border-emerald-100">
            <div className="flex items-center gap-3 min-w-0">
              <Package className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Asset management</span>
                <p className="text-xs text-gray-500">Track equipment, vehicles, and tools by site or company.</p>
              </div>
            </div>
            <Link href="/dashboard/assets" className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Open <ExternalLink size={14} />
            </Link>
          </li>
          <li className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50/80 border border-emerald-100">
            <div className="flex items-center gap-3 min-w-0">
              <WifiOff className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Offline working</span>
                <p className="text-xs text-gray-500">Add items offline; sync when back online.</p>
              </div>
            </div>
            <Link href="/dashboard/offline" className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Open <ExternalLink size={14} />
            </Link>
          </li>
          <li className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50/80 border border-emerald-100">
            <div className="flex items-center gap-3 min-w-0">
              <Award className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-gray-900">Operative qualifications</span>
                <p className="text-xs text-gray-500">Certifications, training, and expiry tracking per operative.</p>
              </div>
            </div>
            <Link href="/dashboard/certifications" className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Open <ExternalLink size={14} />
            </Link>
          </li>
        </ul>
        <p className="text-xs text-gray-500 mt-4">All modules are active. Use the sidebar to access Messages, Assets, Offline, and Certifications.</p>
      </div>
    </div>
  );
}
