"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Mail,
  MessageSquareText,
} from "lucide-react";
import DemoModal from "@/app/components/marketing/modals/DemoModal";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
import MarketingShell from "@/app/components/marketing/MarketingShell";

const CONTACT_EMAIL = "info@construction-runner.com";

export default function ContactPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <>
      <MarketingShell>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
          <MarketingHeader current="contact" />

          <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-10">
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
              Start the conversation.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-700">
              Tell us about your sites and we will follow up with the right next step.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors duration-[120ms] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Request a demo
                <ArrowRight className="h-5 w-5" />
              </button>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition-colors duration-[120ms] hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Email the office
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-[120ms] hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquareText className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Request a demo</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Tell us about your sites, your team, and your rollout. We will follow up.
              </p>
            </button>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-[120ms] hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Email the office</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Write to {CONTACT_EMAIL} for compliance questions or an existing account.
              </p>
            </a>
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors duration-[120ms] hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Plan a rollout</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Map adoption across one site or many. Open a demo request to start.
              </p>
            </button>
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
