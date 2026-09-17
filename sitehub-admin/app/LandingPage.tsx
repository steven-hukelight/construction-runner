"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { GridOverlay } from "@/app/components/marketing/backgrounds/GridOverlay";
import { NoiseOverlay } from "@/app/components/marketing/backgrounds/NoiseOverlay";
import { LightBeams } from "@/app/components/marketing/backgrounds/LightBeams";
import MorphingBlobs from "@/app/components/marketing/backgrounds/MorphingBlobs";
import FloatingShapes from "@/app/components/marketing/effects/FloatingShapes";
import DemoModal from "@/app/components/marketing/modals/DemoModal";
import FeedbackLink from "@/app/components/FeedbackLink";
import FloatingParticles from "@/app/components/marketing/effects/FloatingParticles";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";

const TEASERS = [
  "Geo-verified attendance",
  "Induction & compliance tracking",
  "Real-time site management",
  "RAMS & digital sign-off",
  "Multi-company onboarding",
];

export default function LandingPage() {
  const { t: tr } = useDisplayPreferences();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState("");

  const [honeypot, setHoneypot] = useState("");

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifyError("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website: honeypot }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Request failed");
      setSubmitted(true);
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#1a1f35] to-[#0a0e1a] overflow-x-hidden flex flex-col items-center justify-center">
      <MorphingBlobs />
      <FloatingParticles />
      <NoiseOverlay />
      <LightBeams />
      <GridOverlay />
      <FloatingShapes />

      <Link
        href="/admin/login"
        className="absolute right-5 top-5 z-[100] rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
      >
        {tr("Member Login")}
      </Link>

      <div className="relative z-10 flex flex-col items-center gap-6 md:gap-8 text-center px-4 sm:px-6 py-20 sm:py-24 max-w-3xl mx-auto fade-in-up">
        <div className="relative z-20">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-blue-400/20 blur-2xl" />
          <Image
            src="/Logo.png"
            alt="Construction Runner"
            width={200}
            height={200}
            priority
            unoptimized
            className="h-auto max-h-32 w-auto opacity-90 drop-shadow-[0_10px_24px_rgba(34,211,238,0.22)]"
          />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Construction Runner
          </span>
        </h1>

        <div className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 sm:px-5 py-2 text-cyan-300 text-xs sm:text-sm font-medium tracking-wider uppercase backdrop-blur-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          {tr("Launching soon")}
        </div>

        <p className="text-base sm:text-lg md:text-2xl text-slate-300 max-w-xl font-light leading-relaxed">
          {tr("The modern platform for construction site management is almost ready.")}{" "}
          <span className="text-slate-400 text-base md:text-lg">
            {tr("Smarter compliance. Real-time attendance. Full site control.")}
          </span>
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {TEASERS.map((teaser) => (
            <span
              key={teaser}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs md:text-sm text-slate-400 backdrop-blur-sm"
            >
              {tr(teaser)}
            </span>
          ))}
        </div>

        {!submitted ? (
          <form
            onSubmit={handleNotify}
            className="w-full max-w-md flex flex-col gap-2 mt-2"
          >
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white placeholder:text-slate-500 backdrop-blur-sm outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 whitespace-nowrap"
              >
                {tr("Notify me")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {notifyError && (
              <p className="text-red-400 text-xs text-center">{notifyError}</p>
            )}
          </form>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl sm:rounded-full border border-green-400/30 bg-green-400/10 px-4 sm:px-6 py-3 text-green-300 text-sm sm:text-base font-medium mt-2 max-w-md">
            <CheckCircle className="h-5 w-5 shrink-0" />
            You&apos;re on the list — we&apos;ll reach out when we go live!
          </div>
        )}

        <p className="text-slate-500 text-sm">
          {tr("Want a head start?")}{" "}
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="text-blue-400 hover:text-cyan-400 transition-colors underline underline-offset-4"
          >
            {tr("Request an early demo")}
          </button>
        </p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-700 text-xs select-none px-4">
        <span>© 2026 Construction Runner</span>
        <Link
          href="/legal/terms"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          {tr("Terms of Service")}
        </Link>
        <Link
          href="/legal/privacy-and-security"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          {tr("Privacy & Security")}
        </Link>
        <Link
          href="/contact"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          {tr("Contact")}
        </Link>
        <FeedbackLink variant="landing" />
        <LanguageSwitcher compact className="min-w-[12rem]" />
      </div>

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
