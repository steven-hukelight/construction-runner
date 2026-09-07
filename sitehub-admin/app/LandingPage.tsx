"use client";

import React, { useState, useEffect, useRef } from "react";
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

const LAUNCH_DATE = new Date("2026-05-16T09:00:00");
const FAKE_SIGNUPS = 247;

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  const prev = useRef(value);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    queueMicrotask(() => {
      setFlip(true);
      endTimer = setTimeout(() => setFlip(false), 300);
    });
    return () => {
      if (endTimer !== undefined) clearTimeout(endTimer);
    };
  }, [value]);
  return (
    <div className="flex flex-col items-center gap-1.5 md:gap-2">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl" />
        <div
          className={`relative min-w-[64px] sm:min-w-[72px] md:min-w-[96px] rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm px-2.5 sm:px-3 py-3 sm:py-4 text-center transition-transform duration-300 ${
            flip ? "scale-95 opacity-70" : "scale-100 opacity-100"
          }`}
        >
          <span className="text-3xl sm:text-4xl md:text-6xl font-extrabold tabular-nums bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            {String(value).padStart(2, "0")}
          </span>
        </div>
      </div>
      <span className="text-[10px] md:text-xs font-medium tracking-widest uppercase text-slate-500">
        {label}
      </span>
    </div>
  );
}

const TEASERS = [
  "Geo-verified attendance",
  "Induction & compliance tracking",
  "Real-time site management",
  "RAMS & digital sign-off",
  "Multi-company onboarding",
];

export default function LandingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState("");
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifyError("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
    } catch {
      setNotifyError("Something went wrong — please try again.");
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
        Member Login
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
          Launching soon
        </div>

        <p className="text-base sm:text-lg md:text-2xl text-slate-300 max-w-xl font-light leading-relaxed">
          The modern platform for construction site management is almost
          ready.{" "}
          <span className="text-slate-400 text-base md:text-lg">
            Smarter compliance. Real-time attendance. Full site control.
          </span>
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {TEASERS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs md:text-sm text-slate-400 backdrop-blur-sm"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="w-full max-w-sm sm:max-w-none grid grid-cols-2 sm:flex sm:items-start gap-3 sm:gap-4 md:gap-5 my-2 justify-items-center">
          <CountdownUnit value={days} label="Days" />
          <span className="hidden sm:inline text-3xl md:text-5xl font-bold text-slate-700 mt-3 select-none">
            :
          </span>
          <CountdownUnit value={hours} label="Hours" />
          <span className="hidden sm:inline text-3xl md:text-5xl font-bold text-slate-700 mt-3 select-none">
            :
          </span>
          <CountdownUnit value={minutes} label="Minutes" />
          <span className="hidden sm:inline text-3xl md:text-5xl font-bold text-slate-700 mt-3 select-none">
            :
          </span>
          <CountdownUnit value={seconds} label="Seconds" />
        </div>

        <p className="text-slate-500 text-sm -mt-2">
          <span className="text-slate-300 font-semibold">
            {FAKE_SIGNUPS.toLocaleString()}
          </span>{" "}
          people already on the early-access list
        </p>

        {!submitted ? (
          <form
            onSubmit={handleNotify}
            className="w-full max-w-md flex flex-col gap-2 mt-2"
          >
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
                Notify me <ArrowRight className="h-4 w-4" />
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
          Want a head start?{" "}
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="text-blue-400 hover:text-cyan-400 transition-colors underline underline-offset-4"
          >
            Request an early demo
          </button>
        </p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-700 text-xs select-none px-4">
        <span>© 2026 Construction Runner</span>
        <Link
          href="/contact"
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          Contact
        </Link>
        <FeedbackLink variant="landing" />
      </div>

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
