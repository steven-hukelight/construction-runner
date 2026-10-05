"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LegalConsentLinks } from "@/app/components/LegalConsentLinks";
import { TurnstileWidget } from "@/app/components/TurnstileWidget";
import PasswordRequirements from "@/app/components/PasswordRequirements";
import { isPasswordValid, PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/passwordPolicy";

type RegisterTab = "join" | "newCompany";

function handleReturn() {
  if (typeof window !== "undefined") {
    window.history.back();
  }
}

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<RegisterTab>("join");
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
    if (code) {
      setInviteCode(code);
      setTab("join");
    }
    if (email) setInviteEmail(email);
    if (name) setInviteName(name);
  }, [searchParams]);
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileEpoch, setTurnstileEpoch] = useState(0);
  const [honeypot, setHoneypot] = useState("");

  // Email verification step
  const [verifyRegId, setVerifyRegId] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyDoneMessage, setVerifyDoneMessage] = useState<string | null>(null);
  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  function resetTurnstile() {
    setCaptchaToken(null);
    setTurnstileEpoch((n) => n + 1);
  }

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
          captchaToken,
          website: honeypot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok || (res.status === 502 && json?.needsEmailVerification && json?.registrationId)) {
        setVerifyRegId(json.id ?? json.registrationId);
        setVerifyEmail(newAdminEmail);
        setVerifyMessage(
          res.ok
            ? "We sent a 6-digit code to your email. Enter it below to continue."
            : "Account started, but email may not have sent, use Resend code."
        );
        setNewCompanyName("");
        setNewAdminName("");
        setNewAdminEmail("");
        setNewCompanyPhone("");
        setNewCompanyAddress("");
        resetTurnstile();
      } else {
        setNewCompanyMessage(json?.error || "Registration failed");
        resetTurnstile();
      }
    } catch {
      setNewCompanyMessage("Network error");
      resetTurnstile();
    } finally {
      setNewCompanyLoading(false);
    }
  }

  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isPasswordValid(invitePassword)) {
      setInviteMessage(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
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
          captchaToken,
          website: honeypot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok || (res.status === 502 && json?.needsEmailVerification && json?.registrationId)) {
        setVerifyRegId(json.id ?? json.registrationId);
        setVerifyEmail(inviteEmail);
        setVerifyMessage(
          res.ok
            ? "We sent a 6-digit code to your email. Enter it below to continue."
            : "Account started, but email may not have sent, use Resend code."
        );
        setInviteName("");
        setInviteEmail("");
        setInviteCode("");
        setInvitePassword("");
        resetTurnstile();
      } else {
        setInviteMessage(json?.error || "Registration failed");
        resetTurnstile();
      }
    } catch {
      setInviteMessage("Network error");
      resetTurnstile();
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verifyRegId) return;
    setVerifyLoading(true);
    setVerifyMessage("");
    try {
      const res = await fetch("/api/auth/register/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: verifyRegId, code: verifyCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setVerifyDoneMessage(json.message || "Email verified. Your request is pending approval.");
        setVerifyCode("");
        setVerifyRegId(null);
        setVerifyMessage("");
      } else {
        setVerifyMessage(json?.error || "Verification failed");
      }
    } catch {
      setVerifyMessage("Network error");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResendCode() {
    if (!verifyRegId) return;
    setResendLoading(true);
    setVerifyMessage("");
    try {
      const res = await fetch("/api/auth/register/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: verifyRegId }),
      });
      const json = await res.json().catch(() => ({}));
      setVerifyMessage(res.ok ? "New code sent, check your inbox." : json?.error || "Could not resend");
    } catch {
      setVerifyMessage("Network error");
    } finally {
      setResendLoading(false);
    }
  }

  const registrationsClosed = publicSettings && publicSettings.registrationsOpen === false;
  const maintenance = publicSettings && publicSettings.maintenanceMode === true;
  const blocked = registrationsClosed || maintenance;

  if (!publicSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7fb]">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f3f7fb] p-8">
        <button
          onClick={handleReturn}
          className="mb-6 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow"
          type="button"
        >
          ← Return to previous page
        </button>
        <div className="max-w-md text-center p-8 rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {maintenance ? "Maintenance in progress" : "Registrations are closed"}
          </h1>
          <p className="text-gray-600">
            {maintenance
              ? "We are performing maintenance. Please try again later."
              : "New account requests are not currently being accepted. Please contact your administrator or try again later."}
          </p>
          <a href="/admin/login" className="mt-6 inline-block text-blue-600 font-medium hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  if (verifyDoneMessage) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-[#f3f7fb] px-4 pb-12">
        <div className="w-full max-w-md mt-10 p-8 rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-center">
          <h1 className="text-2xl font-bold text-blue-700 mb-3">Email verified</h1>
          <p className="text-sm text-gray-600 mb-6">{verifyDoneMessage}</p>
          <a
            href="/admin/login"
            className="inline-block bg-blue-600 text-white py-2.5 px-6 rounded-lg font-semibold shadow hover:bg-blue-700"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  if (verifyRegId) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-[#f3f7fb] px-4 pb-12">
        <div className="w-full max-w-md mt-10 p-8 rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h1 className="text-2xl font-bold text-blue-700 mb-2">Verify your email</h1>
          <p className="text-sm text-gray-600 mb-6">
            Enter the 6-digit code we sent to <strong className="text-gray-800">{verifyEmail}</strong>. After that,
            an administrator still needs to approve your account.
          </p>
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                className="border border-gray-300 rounded-lg p-3 w-full text-center text-2xl tracking-[0.4em] font-semibold focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={verifyLoading || verifyCode.length !== 6}
              className="bg-blue-600 text-white py-2.5 px-4 rounded-lg w-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300"
            >
              {verifyLoading ? "Verifying…" : "Verify email"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => void handleResendCode()}
            disabled={resendLoading}
            className="mt-4 w-full text-sm text-blue-600 hover:underline disabled:text-gray-400"
          >
            {resendLoading ? "Sending…" : "Resend code"}
          </button>
          {verifyMessage && <p className="text-sm text-center text-blue-700 mt-4 font-medium">{verifyMessage}</p>}
          <a href="/admin/login" className="mt-6 block text-center text-sm text-gray-500 hover:text-blue-600">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#f3f7fb] px-4 pb-12">
      <button
        onClick={handleReturn}
        className="mb-6 mt-6 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow"
        type="button"
      >
        ← Return to previous page
      </button>

      <div className="w-full max-w-md md:max-w-4xl">
        <h1 className="text-center text-2xl font-bold text-gray-800 mb-2">Create an account</h1>
        <p className="text-center text-sm text-gray-600 mb-6 max-w-xl mx-auto">
          To join an existing organisation you need the <strong className="font-semibold text-gray-800">company invite code</strong> from your
          administrator. Only use &quot;Request new company&quot; if you are setting up a brand-new organisation.
        </p>

        <div
          className="flex rounded-xl border border-gray-200 bg-white p-1 mb-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          role="tablist"
          aria-label="Registration type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "join"}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              tab === "join" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setTab("join")}
          >
            Join with invite code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "newCompany"}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              tab === "newCompany" ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setTab("newCompany")}
          >
            Request new company
          </button>
        </div>

        {/* Honeypot, hidden from users */}
        <label className="sr-only" aria-hidden="true">
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
          />
        </label>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-stretch justify-center">
          {tab === "newCompany" ? (
        <form onSubmit={handleNewCompanySubmit} className="flex flex-col justify-between min-h-[520px] p-8 rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] w-full max-w-md transition-colors duration-[120ms]">
          <p className="text-xs text-gray-600 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
            Your data is collected solely for site access, safety compliance, induction, RAMS acceptance, and legal H&amp;S obligations. It is not used for marketing or profiling.
          </p>
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Request New Company Account</h2>
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
            <TurnstileWidget key={`company-${turnstileEpoch}`} onToken={setCaptchaToken} />
          </div>
          <div className="flex flex-col justify-end flex-1">
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded-lg w-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 transition"
              disabled={newCompanyLoading || (turnstileEnabled && !captchaToken)}
            >
              {newCompanyLoading ? "Submitting..." : "Request New Company"}
            </button>
            <LegalConsentLinks />
            {newCompanyMessage && <div className="text-sm text-center text-blue-700 mt-2 font-medium">{newCompanyMessage}</div>}
          </div>
        </form>
          ) : (
        <form
          onSubmit={handleInviteSubmit}
          id="company-invite-code"
          className="flex flex-col justify-between min-h-[520px] p-8 rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] w-full max-w-md transition-colors duration-[120ms]"
        >
          <p className="text-xs text-gray-600 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
            Your data is collected solely for site access, safety compliance, induction, RAMS acceptance, and legal H&amp;S obligations. It is not used for marketing or profiling.
          </p>
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Join with company invite code</h2>
            <p className="text-sm text-gray-600 mb-4">
              Admins, supervisors, and operatives invited to an existing company enter the code here (it may be filled in automatically if you used your invite link).
            </p>
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
                placeholder="Choose a secure password"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
              />
              <PasswordRequirements password={invitePassword} />
            </div>
            <TurnstileWidget key={`invite-${turnstileEpoch}`} onToken={setCaptchaToken} />
          </div>
          <div className="flex flex-col justify-end flex-1">
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded-lg w-full font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 transition"
              disabled={inviteLoading || (turnstileEnabled && !captchaToken)}
            >
              {inviteLoading ? "Submitting..." : "Submit registration"}
            </button>
            <LegalConsentLinks />
            {inviteMessage && <div className="text-sm text-center text-blue-700 mt-2 font-medium">{inviteMessage}</div>}
          </div>
        </form>
          )}
        </div>
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
