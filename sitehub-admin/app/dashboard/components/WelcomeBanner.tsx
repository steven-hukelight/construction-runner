"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar } from "lucide-react";
import { getUserEmailFromCookie } from "@/lib/utils/cookies";

export default function WelcomeBanner() {
  const [userName, setUserName] = useState<string>("Admin");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to defer setMounted to after paint
    const raf = requestAnimationFrame(() => setMounted(true));
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = currentTime.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    // Fetch user profile name from API using email from cookie
    const email = getUserEmailFromCookie();
    if (email) {
      fetch('/api/users')
        .then(res => res.json())
        .then(users => {
          if (Array.isArray(users)) {
            const user = users.find((u: any) => u.email === email);
            setUserName(user?.displayName || user?.name || "");
          } else {
            setUserName("");
          }
        })
        .catch(() => {
          setUserName("");
        });
    } else {
      setUserName("");
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 via-blue-600 to-white p-12 shadow-2xl"
      style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 10% 80%, rgba(96, 165, 250, 0.3) 0%, transparent 50%)'
      }}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Left content */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 mb-4 border border-white shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-blue-600">Welcome back</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl lg:text-5xl font-bold mb-3"
              style={{ 
                lineHeight: '1.1', 
                letterSpacing: '-0.02em',
              }}
            >
              <span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">{getGreeting()},</span> <br />
              <span 
                className="text-blue-600 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                style={{
                  WebkitTextStroke: '1px #3b82f6',
                  paintOrder: 'stroke fill'
                }}
              >
                {userName}
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-white font-semibold max-w-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              Here's an overview of your construction sites and team activity
            </motion.p>
          </div>

          {/* Right content - Date card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="lg:flex-shrink-0"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 border-4 border-blue-300 shadow-xl min-w-[240px]">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">
                    Today
                  </div>
                  <div className="text-base text-slate-700 font-bold leading-tight">
                    {mounted ? formattedDate : ' '}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
