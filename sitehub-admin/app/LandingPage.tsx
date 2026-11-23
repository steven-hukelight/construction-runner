"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import DemoModal from "@/app/components/marketing/modals/DemoModal";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
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
    body: "People are assigned to sites, then complete the induction content, RAMS, and site rules before they work.",
  },
  {
    icon: ClipboardCheck,
    title: "Understood, not just signed",
    body: "RAMS and briefings can ask three short questions taken from that document. You keep who passed, and the questions stay with that version.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Set the job up",
    body: "Create the site, assign the team, and publish the induction content and RAMS they must read.",
  },
  {
    n: "02",
    title: "They induct on the phone",
    body: "Operatives open Construction Runner, pick their assigned site, complete induction, and answer a short check from the documents they must read.",
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
      setNotifyError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <MarketingShell>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          <MarketingHeader current="home" />

          <section className="mt-8 grid items-center gap-6 lg:mt-10 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Know who is on site.
                <span className="mt-1 block text-blue-800">Prove they understood.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-700 sm:text-lg">
                Construction Runner runs the day on live construction jobs: attendance, induction, RAMS
                and briefings. A short check from each document shows who understood it, not only who signed.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors duration-[120ms] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {tr("Request a demo")}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#notify"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors duration-[120ms] hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                    className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{feature.title}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-gray-700">{feature.body}</p>
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
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <p className="text-sm font-medium text-blue-700">{step.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{step.body}</p>
              </div>
            ))}
          </section>

          <section
            id="notify"
            className="mt-10 rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-10"
          >
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  See it on your sites
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-700 sm:text-base">
                  Request a demo, or leave an email and we will tell you when Construction Runner is
                  ready for your company.
                </p>
              </div>
              <div>
                {!submitted ? (
                  <form onSubmit={handleNotify} className="space-y-2">
                    <div className="hidden" aria-hidden="true">
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label htmlFor="notify-email" className="mb-1 block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          id="notify-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors duration-[120ms] placeholder:text-gray-500 focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors duration-[120ms] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {tr("Notify me")} <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                    {notifyError ? <p className="text-xs text-red-600">{notifyError}</p> : null}
                  </form>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    You are on the list. We will write when we go live.
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="mt-10 rounded-xl bg-slate-900/80 px-4 py-3 text-xs text-white">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
              <span>© 2026 Construction Runner</span>
              <Link href="/legal/terms" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {tr("Terms of Service")}
              </Link>
              <Link href="/legal/privacy-and-security" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {tr("Privacy & Security")}
              </Link>
              <Link href="/contact" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {tr("Contact")}
              </Link>
              <FeedbackLink variant="landing" />
              <LanguageSwitcher compact className="min-w-[12rem]" />
            </div>
          </div>
        </div>
      </MarketingShell>
      <DemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </>
  );
}
