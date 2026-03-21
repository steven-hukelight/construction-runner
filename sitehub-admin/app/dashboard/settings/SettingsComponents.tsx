// SettingsComponents.tsx
import React from "react";

export interface SettingsComponentProps {
  saveSettings: (section: string, data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export function AccountSettings({ saveSettings, saving }: SettingsComponentProps) {
  return (
    <div className="card">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Account Settings</h2>
      <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">Manage your account settings and preferences. For personal information like name, email, and phone, visit your Profile page.</p>
      {/* Example content, add fields as needed */}
      <div className="space-y-3 sm:space-y-4">
        <button className="button" onClick={() => saveSettings("account", {})} disabled={saving}>
          {saving ? "Saving..." : "Save Account Settings"}
        </button>
      </div>
    </div>
  );
}

export function CompanySettings({ saveSettings, saving }: SettingsComponentProps) {
  return (
    <div className="card">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Company Settings</h2>
      {/* Example content, add fields as needed */}
      <div className="space-y-3 sm:space-y-4">
        <button className="button" onClick={() => saveSettings("company", {})} disabled={saving}>
          {saving ? "Saving..." : "Save Company Settings"}
        </button>
      </div>
    </div>
  );
}

// Add other settings components here as needed
