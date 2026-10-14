"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/Button";
import PasswordRequirements from "@/app/components/PasswordRequirements";
import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/passwordPolicy";

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-[120ms] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!isPasswordValid(newPassword)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not change password. Try again.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="change-password-heading" className="space-y-4">
      <h3 id="change-password-heading" className="text-lg font-semibold text-gray-900">
        Change password
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
          <PasswordRequirements password={newPassword} />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={mismatch}
            required
          />
          {mismatch && <p className="text-xs text-red-600">New passwords do not match.</p>}
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {submitting ? "Changing password..." : "Change password"}
        </Button>
      </form>
    </section>
  );
}
