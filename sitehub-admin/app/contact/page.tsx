"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageSquareText,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import DemoModal from "@/app/components/marketing/modals/DemoModal";
import MarketingShell from "@/app/components/marketing/MarketingShell";

const MEMBER_LOGIN_URL = "/admin/login";

const contactOptions = [
  {
    icon: <MessageSquareText className="h-6 w-6" />,
    title: "Request a Demo",
    description:
      "Tell us about your sites, your team, and your rollout goals. We will follow up with the right next step.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Discuss Compliance",
    description:
      "Talk through onboarding, RAMS, attendance verification, and how Construction Runner fits your process.",
  },
  {
    icon: <CalendarDays className="h-6 w-6" />,
    title: "Plan Your Rollout",
    description:
      "Map out adoption across single-site or multi-site operations with a setup that matches your structure.",
  },
];

export default function ContactPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <>
      <MarketingShell>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
          <header className="flex items-center justify-between gap-4 rounded-2xl bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,35,70,0.12)] ring-1 ring-white/70 backdrop-blur-md sm:px-5">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/icon.png?v=3"
                alt="Construction Runner logo"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 shrink-0 object-contain"
              />
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                Construction Runner
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                Home
              </Link>
              <Link
                href={MEMBER_LOGIN_URL}
                className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                Member Login
              </Link>
            </div>
          </header>

          <div className="mx-auto mt-8 max-w-4xl rounded-2xl bg-white/90 px-6 py-10 text-center shadow-[0_8px_24px_rgba(15,35,70,0.12)] ring-1 ring-white/70 backdrop-blur-md sm:px-10">
            <div className="inline-flex items-center rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              Contact Construction Runner
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Start the conversation.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
              Whether you are reviewing platforms, tightening compliance
              workflows, or planning a wider rollout, we can help you assess fit
              quickly.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Request a Demo
                <ArrowRight className="h-5 w-5" />
              </button>
              <Link
                href={MEMBER_LOGIN_URL}
                className="rounded-full border border-blue-100 bg-white px-7 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                Member Login
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {contactOptions.map((option) => (
              <div
                key={option.title}
                className="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_8px_24px_rgba(15,35,70,0.12)] backdrop-blur-md"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  {option.icon}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{option.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{option.description}</p>
              </div>
            ))}
          </div>
        </div>
      </MarketingShell>
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSuccess={() => setIsDemoModalOpen(false)}
      />
    </>
  );
}
