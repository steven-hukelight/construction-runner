"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function handleReturn() {
  if (typeof window !== "undefined") {
    window.history.back();
  }
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const [publicSettings, setPublicSettings] = useState<{
    registrationsOpen?: boolean;
    maintenanceMode?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then(setPublicSettings)
      .catch(() => setPublicSettings({ registrationsOpen: true, maintenanceMode: false }));
  }, []);

  // New company request form state
  const [newCompanyPhone, setNewCompanyPhone] = useState("");
  const [newCompanyAddress, setNewCompanyAddress] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newCompanyMessage, setNewCompanyMessage] = useState("");
  const [newCompanyLoading, setNewCompanyLoading] = useState(false);

  // Admin invite code form state (prefill from URL for operative invite links)
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    const code = searchParams.get("companyCode");
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    if (code) setInviteCode(code);
    if (email) setInviteEmail(email);
    if (name) setInviteName(name);
  }, [searchParams]);
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  async function handleNewCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewCompanyLoading(true);
    setNewCompanyMessage("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdminEmail,
          name: newAdminName,
          companyName: newCompanyName,
          companyPhone: newCompanyPhone,
          companyAddress: newCompanyAddress,
        }),
      });
      if (res.ok) {
        setNewCompanyMessage("New company request submitted. Pending superuser approval.");
        setNewCompanyName("");
        setNewAdminName("");
        setNewAdminEmail("");
        setNewCompanyPhone("");
        setNewCompanyAddress("");
      } else {
        const json = await res.json();
        setNewCompanyMessage(json?.error || "Registration failed");
      }
    } catch {
      setNewCompanyMessage("Network error");
    } finally {
      setNewCompanyLoading(false);
    }
  }

  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMessage("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          companyCode: inviteCode,
          password: invitePassword,
        }),
      });
      if (res.ok) {
        setInviteMessage("Account request submitted. Pending approval.");
        setInviteName("");
        setInviteEmail("");
        setInviteCode("");
        setInvitePassword("");
      } else {
        const json = await res.json();
        setInviteMessage(json?.error || "Registration failed");
      }
    } catch {
      setInviteMessage("Network error");
    } finally {
      setInviteLoading(false);
    }
  }

  const registrationsClosed = publicSettings && publicSettings.registrationsOpen === false;
  const maintenance = publicSettings && publicSettings.maintenanceMode === true;
  const blocked = registrationsClosed || maintenance;

  if (!publicSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-8">
        <button
          onClick={handleReturn}
          className="mb-6 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow"
          type="button"
        >
          ← Return to previous page
        </button>
        <div className="max-w-md text-center p-8 rounded-2xl bg-white shadow-xl border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {maintenance ? "Maintenance in progress" : "Registrations are closed"}
          </h1>
          <p className="text-gray-600">
            {maintenance
              ? "We are performing maintenance. Please try again later."
              : "New account requests are not currently being accepted. Please contact your administrator or try again later."}
          </p>
          <a href="/login" className="mt-6 inline-block text-blue-600 font-medium hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <button
        onClick={handleReturn}
        className="mb-8 mt-6 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow"
        type="button"
      >
        ← Return to previous page
      </button>
      <div className="flex flex-col md:flex-row gap-12 items-stretch">
        {/* New Company Request Form */}
        <form onSubmit={handleNewCompanySubmit} className="flex flex-col justify-between min-h-[600px] p-8 rounded-2xl bg-white shadow-xl border border-blue-100 w-96 transition-all hover:shadow-2xl">
          <p className="text-xs text-gray-600 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
            Your data is collected solely for site access, safety compliance, induction, RAMS acceptance, and legal H&amp;S obligations. It is not used for marketing or profiling.
          </p>
          <div>
            <h1 className="text-2xl font-bold text-blue-700 mb-2">Request New Company Account</h1>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Work Email</label>
              <input
                type="email"
                placeholder="Your work email"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                placeholder="Company name"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company Phone</label>
              <input
                type="tel"
                placeholder="Company phone number"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={newCompanyPhone}
                onChange={(e) => setNewCompanyPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company Address</label>
              <input
                type="text"
                placeholder="Company address"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={newCompanyAddress}
                onChange={(e) => setNewCompanyAddress(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col justify-end flex-1">
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded-lg w-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 transition"
              disabled={newCompanyLoading}
            >
              {newCompanyLoading ? "Submitting..." : "Request New Company"}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">
              By continuing, you agree to our{" "}
              <a href="/legal/privacy-and-security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy & Security Policy
              </a>
              .
            </p>
            {newCompanyMessage && <div className="text-sm text-center text-blue-700 mt-2 font-medium">{newCompanyMessage}</div>}
          </div>
        </form>

        {/* Admin Invite Code Form */}
        <form onSubmit={handleInviteSubmit} className="flex flex-col justify-between min-h-[600px] p-8 rounded-2xl bg-white shadow-xl border border-blue-100 w-96 transition-all hover:shadow-2xl">
          <p className="text-xs text-gray-600 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
            Your data is collected solely for site access, safety compliance, induction, RAMS acceptance, and legal H&amp;S obligations. It is not used for marketing or profiling.
          </p>
          <div>
            <h1 className="text-2xl font-bold text-blue-700 mb-2">Request Admin or Supervisor Account (Invite Code)</h1>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Work Email</label>
              <input
                type="email"
                placeholder="Your work email"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Company Invite Code</label>
              <input
                type="text"
                placeholder="Company invite code"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Set Password</label>
              <input
                type="password"
                placeholder="Choose a password"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col justify-end flex-1">
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded-lg w-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 transition"
              disabled={inviteLoading}
            >
              {inviteLoading ? "Submitting..." : "Request Admin Account"}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">
              By continuing, you agree to our{" "}
              <a href="/legal/privacy-and-security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy & Security Policy
              </a>
              .
            </p>
            {inviteMessage && <div className="text-sm text-center text-blue-700 mt-2 font-medium">{inviteMessage}</div>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
