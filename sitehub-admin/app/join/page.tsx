"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { LegalConsentLinks } from "@/app/components/LegalConsentLinks";

export default function JoinWithCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Join as subcontractor</h1>
            <p className="text-sm text-gray-500">Enter the invite code from your main contractor.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
          Your data is collected solely for the purposes of site access, safety compliance, induction, RAMS acceptance, and legal health &amp; safety obligations. It is not used for marketing or profiling.
        </p>
        {created ? (
          <div className="space-y-4 text-sm text-gray-700">
            <p className="p-3 rounded-lg bg-green-50 border border-green-100">
              Account created. Check <span className="font-medium">{email}</span> for a link to set your
              password (expires in 1 hour).
            </p>
            <p>
              If the email does not arrive, use{" "}
              <Link href="/forgot-password" className="text-blue-600 font-medium hover:underline">
                Forgot password
              </Link>
              , then sign in.
            </p>
            <Link
              href={`/admin/login?email=${encodeURIComponent(email.trim())}&from=invite`}
              className="block w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-center hover:bg-blue-700"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invite code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 font-mono tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. ABC12XYZ"
              maxLength={12}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name (optional)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your company"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Continue"}
          </button>
          <LegalConsentLinks className="text-center text-xs text-gray-500 mt-3" />
        </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/admin/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
