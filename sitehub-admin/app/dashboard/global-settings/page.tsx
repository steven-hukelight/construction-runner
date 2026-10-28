"use client";

import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import { Palette, ToggleLeft, Megaphone, Mail } from "lucide-react";

export default function GlobalSettingsPage() {
  const [branding, setBranding] = useState({ appName: "Construction Runner", supportEmail: "" });
  const [featureToggles, setFeatureToggles] = useState({ registrationsOpen: true, maintenanceMode: false });
  const [emailNotifications, setEmailNotifications] = useState({ operativePendingApproval: true });
  const [announcement, setAnnouncement] = useState("");
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
        const en = data.emailNotifications ?? {};
        setEmailNotifications({
          operativePendingApproval: en.operativePendingApproval !== false,
        });
        setAnnouncement(data.announcement ?? data.announcements?.message ?? "");
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
      } else if (section === "emailNotifications") {
        body = { section: "emailNotifications", config: emailNotifications };
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
            <Palette className="w-5 h-5 shrink-0 text-gray-400" aria-hidden />
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
            <ToggleLeft className="w-5 h-5 shrink-0 text-gray-400" aria-hidden />
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
            <Mail className="w-5 h-5 shrink-0 text-gray-400" aria-hidden />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email notifications</h3>
              <p className="text-sm text-gray-600">Requires RESEND_API_KEY, SENDGRID_API_KEY, or SMTP in production</p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications.operativePendingApproval}
                onChange={(e) =>
                  setEmailNotifications((p) => ({ ...p, operativePendingApproval: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">
                Send email when a new operative registers (pending approval), company admins/supervisors and info@construction-runner.com
              </span>
            </label>
            <Button size="sm" onClick={() => handleSave("emailNotifications")} disabled={saving === "emailNotifications"}>
              {saving === "emailNotifications" ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Megaphone className="w-5 h-5 shrink-0 text-gray-400" aria-hidden />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">System-wide announcements</h3>
              <p className="text-sm text-gray-600">Banner message for all users</p>
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
      </div>
    </div>
  );
}
