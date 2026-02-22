"use client";



import React, { useState, useEffect } from "react";
import { Bell, Settings, Sparkles } from "lucide-react";
import LogoutButton from "../LogoutButton";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getRoleFromClient } from "@/lib/utils/cookies";

const CompanySwitcher = dynamic(() => import("../CompanySwitcher"), { ssr: false });

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const page = pathname.split("/").pop();

  function handleProfile() {
    router.push("/dashboard/profile");
  }

  const [isSuperuser, setIsSuperuser] = useState(false);
  useEffect(() => {
    setIsSuperuser(getRoleFromClient()?.toLowerCase() === "superuser");
  }, []);

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1>{page}</h1>
          <p className="muted">Manage your construction projects</p>
        </div>
        {isSuperuser && (
          <div className="ml-4">
            <CompanySwitcher />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button 
          className="p-2.5 rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200/60 hover:bg-white hover:shadow-lg transition-all duration-300 relative group"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </button>

        <button 
          onClick={handleProfile}
          className="relative overflow-hidden p-0.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 cursor-pointer group"
          title="View profile"
        >
          <div className="bg-white/10 backdrop-blur-sm p-3 rounded-[10px] flex items-center justify-center">
            <span className="text-white font-bold text-base">S</span>
          </div>
        </button>

        <LogoutButton />
      </div>
    </header>
  );
}
