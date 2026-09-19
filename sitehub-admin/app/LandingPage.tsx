"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import DemoModal from "@/app/components/marketing/modals/DemoModal";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import FeedbackLink from "@/app/components/FeedbackLink";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";

const FEATURES = [
  {
    icon: MapPin,
    title: "Who is on site",
    body: "Geo-verified clock-in so the office sees a live roll, not a paper sign-in sheet.",
  },
  {
    icon: ShieldCheck,
    title: "Induction that sticks",
    body: "People are assigned to sites, then complete the safety pack, RAMS, and site rules before they work.",
  },
  {
    icon: ClipboardCheck,
    title: "RAMS and sign-off",
    body: "Issue the method statement, collect digital acknowledgement, and keep the audit trail with the job.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Set the job up",
    body: "Create the site, assign the team, and publish the safety pack and RAMS they must read.",
  },
  {
    n: "02",
    title: "They induct on the phone",
    body: "Operatives open Construction Runner, pick their assigned site, and complete induction on the day.",
  },
  {
    n: "03",
    title: "You run the day",
    body: "Attendance, outstanding inductions, and missing info sit in one office view — not a chase round WhatsApp.",
  },
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
    <>
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,35,70,0.12)] ring-1 ring-white/70 backdrop-blur-md sm:px-5">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png?v=3"
              alt="Construction Runner logo"
              width={56}
              height={56}
              priority
              unoptimized
              className="h-14 w-14 shrink-0 object-contain"
            />
            <span className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Construction Runner
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/contact"
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-blue-700 sm:px-4"
            >
              {tr("Contact")}
            </Link>
            <Link
              href="/admin/login"
              className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              {tr("Member Login")}
            </Link>
          </nav>
        </header>

        <section className="mt-8 grid items-center gap-6 lg:mt-10 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/90 p-6 shadow-[0_8px_24px_rgba(15,35,70,0.12)] ring-1 ring-white/70 backdrop-blur-md sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Site operations software
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Know who is on site.
              <span className="mt-1 block text-blue-800">Know they are signed off.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Construction Runner is built for live construction jobs: attendance, induction, RAMS,
              and the office view that keeps the day under control.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {tr("Request a demo")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#notify"
                className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200"
              >
                Get launch updates
              </a>
            </div>
          </div>

          <div className="space-y-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex gap-4 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,35,70,0.12)] backdrop-blur-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{feature.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{feature.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_8px_24px_rgba(15,35,70,0.12)] backdrop-blur-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">{step.n}</p>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          ))}
        </section>

        <section
          id="notify"
          className="mt-10 rounded-2xl border border-white/70 bg-white/90 px-6 py-8 shadow-[0_8px_24px_rgba(15,35,70,0.12)] backdrop-blur-md sm:px-10"
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                See it on your sites
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Request a demo, or leave an email and we will tell you when Construction Runner is
                ready for your company.
              </p>
            </div>
            <div>
              {!submitted ? (
                <form onSubmit={handleNotify} className="space-y-2">
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
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="flex-1 rounded-full border border-blue-100 bg-[#f7fafc] px-5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      {tr("Notify me")} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  {notifyError && <p className="text-xs text-red-600">{notifyError}</p>}
                </form>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  You&apos;re on the list — we&apos;ll reach out when we go live!
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 pb-2 text-xs text-white/80">
          <span>© 2026 Construction Runner</span>
          <Link href="/legal/terms" className="hover:text-white">
            {tr("Terms of Service")}
          </Link>
          <Link href="/legal/privacy-and-security" className="hover:text-white">
            {tr("Privacy & Security")}
          </Link>
          <Link href="/contact" className="hover:text-white">
            {tr("Contact")}
          </Link>
          <FeedbackLink variant="landing" />
          <LanguageSwitcher compact className="min-w-[12rem]" />
        </div>
      </div>
    </MarketingShell>
    <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  );
}
