"use client";
import Link from 'next/link';
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Button from "../dashboard/components/ui/Button";
import Input from "../dashboard/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";

function SetupPasswordInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to set password. Please try again.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card w-full max-w-md mx-auto mt-12 p-6">
        <h2 className="text-2xl font-bold mb-4 text-blue-600">Password Set!</h2>
        <p className="text-gray-700 mb-6">Your password has been set. You can now log in.</p>
        <Link href="/login">
          <Button variant="primary">Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md mx-auto mt-12 p-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Set Your Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" value={email} disabled />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400 hover:text-blue-600"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-400 hover:text-blue-600"
            tabIndex={-1}
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {password && confirm && password !== confirm && (
          <div className="text-xs text-red-400">Passwords do not match.</div>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Setting..." : "Set Password"}
        </Button>
        <p className="text-center text-xs text-gray-500 mt-3">
          By continuing, you agree to our{" "}
          <a href="/legal/privacy-and-security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Privacy & Security Policy
          </a>
          .
        </p>
      </form>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupPasswordInner />
    </Suspense>
  );
}
