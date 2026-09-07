"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquareText,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { GridOverlay } from "@/app/components/marketing/backgrounds/GridOverlay";
import { NoiseOverlay } from "@/app/components/marketing/backgrounds/NoiseOverlay";
import { LightBeams } from "@/app/components/marketing/backgrounds/LightBeams";
import MorphingBlobs from "@/app/components/marketing/backgrounds/MorphingBlobs";
import FloatingParticles from "@/app/components/marketing/effects/FloatingParticles";
import RippleEffect from "@/app/components/marketing/effects/RippleEffect";
import PageContainer from "@/app/components/marketing/layout/PageContainer";
import Section from "@/app/components/marketing/layout/Section";
import DemoModal from "@/app/components/marketing/modals/DemoModal";

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
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0a0e1a] via-[#1a1f35] to-[#0a0e1a]">
      <MorphingBlobs />
      <FloatingParticles />
      <NoiseOverlay />
      <LightBeams />
      <GridOverlay />
      <RippleEffect />

      <div className="absolute right-5 top-5 z-[100] flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          Home
        </Link>
        <Link
          href={MEMBER_LOGIN_URL}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          Member Login
        </Link>
      </div>

      <Section center className="relative min-h-screen py-24">
        <PageContainer>
          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-sm">
              Contact Construction Runner
            </div>

            <h1 className="mt-8 text-5xl font-extrabold leading-tight text-white md:text-7xl">
              Start the conversation.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300 md:text-xl">
              Whether you are reviewing platforms, tightening compliance
              workflows, or planning a wider rollout, we can help you assess fit
              quickly.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/50"
              >
                Request a Demo
                <ArrowRight className="h-5 w-5" />
              </button>
              <Link
                href={MEMBER_LOGIN_URL}
                className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-lg font-semibold text-slate-200 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                Member Login
              </Link>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {contactOptions.map((option) => (
                <div
                  key={option.title}
                  className="glass rounded-3xl border border-white/10 p-8 text-left transition-all duration-300 hover:border-white/20 hover:bg-white/10"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm">
                    {option.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {option.title}
                  </h2>
                  <p className="mt-3 text-slate-300">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </Section>

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSuccess={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
