"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LegalConsentLinks } from "@/app/components/LegalConsentLinks";

export default function JoinSubcontractorForm({
  initialCode = "",
  initialName = "",
  initialCompany = "",
}: {
  initialCode?: string;
  initialName?: string;
  initialCompany?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState(initialName);
  const [companyName, setCompanyName] = useState(initialCompany);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim() || !email.trim()) {
      setError("Code and email are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invite-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          email: email.trim(),
          name: name.trim() || undefined,
          companyName: companyName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to redeem code");
        return;
      }
      if (data?.existingUser) {
        router.push(`/admin/login?email=${encodeURIComponent(email.trim())}&from=invite`);
        return;
      }
      setCreated(true);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-4 text-sm text-gray-700">
        <p className="rounded-lg border border-green-100 bg-green-50 p-3">
          Account created. Check <span className="font-medium">{email}</span> for a link to set your
          password (expires in 1 hour).
        </p>
        <p>
          If the email does not arrive, use{" "}
          <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
            Forgot password
          </Link>
          , then sign in.
        </p>
        <Link
          href={`/admin/login?email=${encodeURIComponent(email.trim())}&from=invite`}
          className="block w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-gray-600">
        Use the invite code from your main contractor. Office staff joining a company should use
        Join company instead.
      </p>
      <div>
        <label htmlFor="join-code" className="mb-1 block text-sm font-medium text-gray-700">
          Invite code
        </label>
        <input
          id="join-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 font-mono tracking-wider text-gray-900 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="e.g. ABC12XYZ"
          maxLength={12}
        />
      </div>
      <div>
        <label htmlFor="join-email" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="join-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="you@company.com"
          required
        />
      </div>
      <div>
        <label htmlFor="join-name" className="mb-1 block text-sm font-medium text-gray-700">
          Your name (optional)
        </label>
        <input
          id="join-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="Jane Smith"
        />
      </div>
      <div>
        <label htmlFor="join-company" className="mb-1 block text-sm font-medium text-gray-700">
          Company name (optional)
        </label>
        <input
          id="join-company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          placeholder="Your company"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating account…" : "Continue"}
      </button>
      <LegalConsentLinks className="mt-3 text-center text-xs text-gray-500" />
    </form>
  );
}
