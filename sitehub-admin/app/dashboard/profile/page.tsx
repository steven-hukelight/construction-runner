"use client";
import toast from "react-hot-toast";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { User, Shield, FileText, Award, Eye, EyeOff, ClipboardCheck, ExternalLink } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { supabase } from "@/supabase/auth/client";
import SuperuserSelfOverrideSection from "../induction-compliance/components/SuperuserSelfOverrideSection";
import { preInductionUiEnabled } from "@/lib/featureFlags";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/app/DisplayPreferencesProvider";
import { useClientSession } from "../components/ClientSessionProvider";
import { roleDisplayName } from "@/lib/auth/roles";
import RoleBadge from "../components/RoleBadge";
import { roleAvatarClass } from "@/lib/ui/roleStyles";
import ProfileCertificationsTab from "./ProfileCertificationsTab";
import ProfileMedicalTab from "./ProfileMedicalTab";
import ProfilePrivacyTab from "./ProfilePrivacyTab";

type TabType = "personal" | "activity" | "certifications" | "medical" | "induction" | "privacy";

export default function ProfilePage() {
  const { role: sessionRole } = useClientSession();
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    avatar: "",
    role: "ADMIN",
    status: "Active",
    joinedDate: "",
    updatedAt: "",
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const [extra, setExtra] = useState({
    jobTitle: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    niNumber: "",
    utrNumber: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    restrictNonEssentialProcessing: false,
  });
  const [showNi, setShowNi] = useState(false);
  const [showUtr, setShowUtr] = useState(false);
  const [showNiSummary, setShowNiSummary] = useState(false);
  const [showUtrSummary, setShowUtrSummary] = useState(false);
  const [niAutofillWarning, setNiAutofillWarning] = useState(false);
  const [utrAutofillWarning, setUtrAutofillWarning] = useState(false);

  function maskNi(val: string): string {
    if (!val) return "";
    const clean = val.replace(/\s+/g, "");
    if (clean.length <= 2) return "*".repeat(clean.length);
    const first = clean.slice(0, 2);
    const last = clean.slice(-1);
    return `${first}${"*".repeat(Math.max(0, clean.length - 3))}${last}`;
  }

  function maskUtr(val: string): string {
    if (!val) return "";
    const digits = val.replace(/\D+/g, "");
    if (digits.length <= 4) return "*".repeat(digits.length);
    const visible = digits.slice(-4);
    return `${"*".repeat(digits.length - 4)}${visible}`;
  }

  function isValidNi(val: string): boolean {
    const v = (val || "").toUpperCase().replace(/\s+/g, "");
    return v === "" || /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/.test(v);
  }
  function isValidUtr(val: string): boolean {
    const v = (val || "").replace(/\s+/g, "");
    return v === "" || /^\d{10}$/.test(v);
  }
  function isValidUkPhone(val: string): boolean {
    const v = (val || "").replace(/\s+/g, "");
    return v === "" || /^(\+44\d{10}|0\d{10}|\d{11})$/.test(v);
  }
  const getDobParts = useCallback((input: unknown): { d: string; m: string; y: string } => {
    try {
      if (!input) return { d: "", m: "", y: "" };
      let dt: Date | null = null;
      if (typeof (input as { toDate?: () => Date }).toDate === "function") dt = (input as { toDate: () => Date }).toDate();
      else if (typeof (input as { seconds?: number }).seconds === "number") dt = new Date((input as { seconds: number }).seconds * 1000);
      else if (input instanceof Date) dt = input;
      else if (typeof input === "string") {
        const s = input.trim();
        const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const mUk = s.match(/^([0-3]?\d)[\/-]([01]?\d)[\/-](\d{4})$/);
        if (mIso) return { y: mIso[1], m: mIso[2], d: mIso[3] };
        if (mUk) return { d: mUk[1].padStart(2, "0"), m: mUk[2].padStart(2, "0"), y: mUk[3] };
        const p = Date.parse(s);
        if (!isNaN(p)) dt = new Date(p);
      }
      if (dt) {
        const d = String(dt.getDate()).padStart(2, "0");
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const y = String(dt.getFullYear());
        return { d, m, y };
      }
    } catch {}
    return { d: "", m: "", y: "" };
  }, []);

  const loadProfileViaApi = useCallback(
    async (force = false) => {
      // Avoid overwriting in-progress edits unless explicitly forced
      if (!force && isDirtyRef.current) return;
      try {
        const r = await fetch("/api/profiles/me", { cache: "no-store", credentials: "include" }).catch(() => null);
        if (!r || !r.ok) {
          const fallbackId = await loadProfile();
          if (fallbackId) await loadProfileData(fallbackId);
          return;
        }
        const json = await r.json().catch(() => null);
        if (!json) {
          const fallbackId = await loadProfile();
          if (fallbackId) await loadProfileData(fallbackId);
          return;
        }
        const data = Array.isArray(json) && json.length ? json[0] : json && typeof json === "object" ? json : null;
        if (!data || typeof data !== "object") {
          setLoading(false);
          const fallbackId = await loadProfile();
          if (fallbackId) await loadProfileData(fallbackId);
          return;
        }
        const profileUserId = (data.id as string) || "";
        if (!profileUserId) {
          const fallbackId = await loadProfile();
          if (fallbackId) await loadProfileData(fallbackId);
          setLoading(false);
          return;
        }
        setUserId(profileUserId);
        const created = (data.createdAt as string) || (data.joinedDate as string) || "";
        setProfile({
          name: String(data.displayName || data.name || "").trim(),
          email: String(data.email || "").trim(),
          phone: String(data.phone || "").trim(),
          location: String(data.addressLine1 || data.location || "").trim(),
          bio: String(data.bio || ""),
          avatar: String(data.avatar || ""),
          role: String(data.role || "ADMIN"),
          status: String(data.status || "Active"),
          joinedDate: created,
          updatedAt: String(data.updatedAt || ""),
        });
        setNotes(String(data.notes || ""));
        const { d, m, y } = getDobParts(data.dateOfBirth || data.dob);
        setExtra({
          jobTitle: String(data.jobTitle || "").trim(),
          emergencyContactName: String(data.emergencyContactName || "").trim(),
          emergencyContactPhone: String(
            data.emergencyContactPhone || data.emergencyPhone || data.emergencyContactNumber || ""
          ).trim(),
          niNumber: (() => {
            const ni = String(data.niNumber || data.nationalInsurance || "").trim();
            const ok = isValidNi(ni);
            setNiAutofillWarning(!!ni && !ok);
            return ok ? ni : "";
          })(),
          utrNumber: (() => {
            const utr = String(data.utrNumber || data.utr || "").trim();
            const ok = isValidUtr(utr);
            setUtrAutofillWarning(!!utr && !ok);
            return ok ? utr : "";
          })(),
          dobDay: d,
          dobMonth: m,
          dobYear: y,
          restrictNonEssentialProcessing: !!(data.restrictNonEssentialProcessing === true),
        });
      } catch (e) {
        console.error("Error loading profile via /api/profiles/me:", e);
      } finally {
        setLoading(false);
      }
    },
    // loadProfile / loadProfileData are defined below; they are stable (empty / [getDobParts] deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional ordering; avoids hook reorder refactor
    [getDobParts]
  );

  useEffect(() => {
    void loadProfileViaApi();
  }, [loadProfileViaApi]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);


  /** Resolves userId from email. Used as fallback. */
  const loadProfile = useCallback(async (): Promise<string | undefined> => {
    try {
      const r = await fetch("/api/me", { credentials: "include" });
      const me = await r.json();
      const userDocId = me?.id;
      if (userDocId) {
        setUserId(userDocId);
        setProfile((prev) => ({
          ...prev,
          email: me.email || prev.email,
          role: me.role || "ADMIN",
          status: "Active",
          joinedDate: me.joinedDate || "",
        }));
        setNotes(me.notes || "");
      }
      return userDocId;
    } catch (error) {
      console.error("Error loading profile:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Load personal info from profiles/users. Tries API first, then direct Supabase. */
  const loadProfileData = useCallback(
    async (profileUserId: string) => {
      const applyData = (data: Record<string, unknown>) => {
        const displayName = String(data.displayName || data.name || "").trim();
        const phone = String(data.phone || "").trim();
        const address = String(data.addressLine1 || data.location || "").trim();
        setProfile((prev) => ({
          ...prev,
          name: displayName || prev.name,
          phone: phone || prev.phone,
          location: address || prev.location,
          bio: (data.bio as string) || prev.bio,
          avatar: (data.avatar as string) || prev.avatar,
        }));
        const { d, m, y } = getDobParts(data.dateOfBirth || data.dob);
        const ni = String(data.niNumber || data.nationalInsurance || "").trim();
        const utr = String(data.utrNumber || data.utr || "").trim();
        const emergPhone = String(data.emergencyContactPhone || data.emergencyPhone || data.emergencyContactNumber || "").trim();
        const niOk = isValidNi(ni);
        const utrOk = isValidUtr(utr);
        setNiAutofillWarning(!!ni && !niOk);
        setUtrAutofillWarning(!!utr && !utrOk);
        setExtra({
          jobTitle: String(data.jobTitle || "").trim(),
          emergencyContactName: String(data.emergencyContactName || "").trim(),
          emergencyContactPhone: emergPhone,
          niNumber: niOk ? ni : "",
          utrNumber: utrOk ? utr : "",
          dobDay: d,
          dobMonth: m,
          dobYear: y,
          restrictNonEssentialProcessing: !!(data.restrictNonEssentialProcessing === true),
        });
      };

      try {
        const r = await fetch(`/api/profiles?userId=${encodeURIComponent(profileUserId)}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = await r.json();
        const apiData = Array.isArray(json) && json.length ? json[0] : null;
        if (apiData && typeof apiData === "object") {
          applyData(apiData as Record<string, unknown>);
          return;
        }
      } catch (apiErr) {
        console.warn("Profile API fetch failed, trying Supabase:", apiErr);
      }

      try {
        const [userRes, profileRes] = await Promise.all([
          supabase.from("users").select("*").eq("id", profileUserId).single(),
          supabase.from("profiles").select("*").eq("user_id", profileUserId).maybeSingle(),
        ]);
        const userData = (userRes.data || {}) as Record<string, unknown>;
        const profileData = (profileRes.data || {}) as Record<string, unknown>;
        applyData({ ...userData, ...profileData });
      } catch (e) {
        console.error("Error loading profile data:", e);
      }
    },
    [getDobParts]
  );

  const updateProfile = (update: Partial<typeof profile>) => {
    setIsDirty(true);
    setProfile((prev) => ({ ...prev, ...update }));
  };

  const updateExtra = (update: Partial<typeof extra>) => {
    setIsDirty(true);
    setExtra((prev) => ({ ...prev, ...update }));
  };

  async function handleSave() {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        const me = await r.json();
        effectiveUserId = me?.id ?? "";
        if (effectiveUserId) setUserId(effectiveUserId);
      } catch {
        // ignore
      }
    }
    if (!effectiveUserId) {
      toast.error("User ID not found. Please refresh and try again.");
      console.error("Missing userId for profile save.");
      return;
    }

    if (profile.phone && !isValidUkPhone(profile.phone)) {
      toast.error("Please enter a valid UK phone number for your profile.");
      console.error("Invalid phone number:", profile.phone);
      return;
    }
    if (extra.emergencyContactPhone && !isValidUkPhone(extra.emergencyContactPhone)) {
      toast.error("Please enter a valid UK phone number.");
      return;
    }
    if (extra.niNumber && !isValidNi(extra.niNumber)) {
      toast.error("Please enter a valid NI number (e.g., QQ123456C).");
      return;
    }
    if (extra.utrNumber && !isValidUtr(extra.utrNumber)) {
      toast.error("Please enter a valid 10-digit UTR.");
      return;
    }

    setSaving(true);
    try {
      const day = extra.dobDay.padStart(2, "0");
      const month = extra.dobMonth.padStart(2, "0");
      const year = extra.dobYear;
      const dobIso = day && month && year ? `${year}-${month}-${day}` : "";

      // 1. Write ALL personal info to users/{userId}/profile/data via API
      const profileRes = await fetch("/api/profiles", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          displayName: profile.name || profile.email || "",
          phone: profile.phone,
          bio: profile.bio,
          avatar: profile.avatar,
          addressLine1: profile.location,
          jobTitle: extra.jobTitle || "",
          emergencyContactName: extra.emergencyContactName || "",
          emergencyContactPhone: extra.emergencyContactPhone || "",
          niNumber: extra.niNumber || "",
          utrNumber: extra.utrNumber || "",
          dateOfBirth: dobIso || undefined,
        }),
      });
      if (!profileRes.ok) throw new Error("Failed to save profile data");

      // 2. Update user via API
      await fetch("/api/profiles", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: effectiveUserId, email: profile.email, role: profile.role, status: profile.status, notes }),
      });

      toast.success("Profile saved");
      setIsDirty(false);
      await loadProfileViaApi(true);
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to save profile: " + message);
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile.name || profile.email || "";

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter((n) => n && n.trim());
    if (parts.length === 0) return "U";
    return parts
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [displayName]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details and preferences"
        action={
          <button onClick={handleSave} className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab("personal")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] ${
            activeTab === "personal" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <User size={16} />
          Personal
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] ${
            activeTab === "activity" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <FileText size={16} />
          Activity
        </button>
        <button
          onClick={() => setActiveTab("certifications")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] ${
            activeTab === "certifications" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Award size={16} />
          Certification & Training
        </button>
        <button
          onClick={() => setActiveTab("medical")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] ${
            activeTab === "medical" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <FileText size={16} />
          Medical History
        </button>
        {preInductionUiEnabled && (
          <button
            onClick={() => setActiveTab("induction")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] ${
              activeTab === "induction"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <ClipboardCheck size={16} />
            Induction
          </button>
        )}
        <button
          onClick={() => setActiveTab("privacy")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-[120ms] ${
            activeTab === "privacy" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Shield size={16} />
          Privacy & Data
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginTop: '2.5rem' }}>
        {/* Left Column - User Card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex flex-col items-center text-center space-y-4">
              <div
                className={`flex items-center justify-center rounded-full text-xl font-semibold ${roleAvatarClass(profile.role)}`}
                style={{ width: "100px", height: "100px" }}
              >
                {initials}
              </div>
              <div className="w-full">
                <h3 className="font-semibold text-slate-900 text-lg">{displayName}</h3>
                <div className="mt-2 flex justify-center">
                  <RoleBadge role={profile.role} />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
              <h4 className="font-semibold text-slate-900 text-sm">Personal information</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="text-slate-900 font-medium text-right">{profile.phone || "Not set"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Email address</span>
                  <span className="text-slate-900 font-medium text-right break-all">{profile.email}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Added Date</span>
                  <span className="text-slate-900 font-medium">
                    {profile.joinedDate && !isNaN(Date.parse(profile.joinedDate))
                      ? formatDateTime(profile.joinedDate)
                      : <span className="text-slate-400">Not set</span>}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {profile.status}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Home address</span>
                  <span className="text-slate-900 font-medium">{profile.location || "Not set"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Job Title</span>
                  <span className="text-slate-900 font-medium text-right">{extra.jobTitle || "Not set"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Emergency Contact</span>
                  <span className="text-slate-900 font-medium text-right">{extra.emergencyContactName || "Not set"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Emergency Phone</span>
                  <span className="text-slate-900 font-medium text-right">{extra.emergencyContactPhone || "Not set"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">NI Number</span>
                  <span className="flex items-center gap-2 text-slate-900 font-medium text-right">
                    {extra.niNumber ? (showNiSummary ? extra.niNumber : maskNi(extra.niNumber)) : "Not set"}
                    {extra.niNumber && (
                      <span className="relative inline-flex items-center group">
                        <button
                          type="button"
                          onClick={() => setShowNiSummary((v) => !v)}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                          aria-label={showNiSummary ? "Hide NI in summary" : "Show NI in summary"}
                        >
                          {showNiSummary ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {showNiSummary ? "Hide NI (Summary)" : "Show NI (Summary)"}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">UTR Number</span>
                  <span className="flex items-center gap-2 text-slate-900 font-medium text-right">
                    {extra.utrNumber ? (showUtrSummary ? extra.utrNumber : maskUtr(extra.utrNumber)) : "Not set"}
                    {extra.utrNumber && (
                      <span className="relative inline-flex items-center group">
                        <button
                          type="button"
                          onClick={() => setShowUtrSummary((v) => !v)}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                          aria-label={showUtrSummary ? "Hide UTR in summary" : "Show UTR in summary"}
                        >
                          {showUtrSummary ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {showUtrSummary ? "Hide UTR (Summary)" : "Show UTR (Summary)"}
                        </span>
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Date of Birth</span>
                  <span className="text-slate-900 font-medium text-right">
                    {extra.dobDay && extra.dobMonth && extra.dobYear ? `${extra.dobDay}/${extra.dobMonth}/${extra.dobYear}` : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "personal" && (
            <>
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-6">Edit Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => updateProfile({ name: e.target.value })}
                      className="input w-full"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => updateProfile({ email: e.target.value })}
                      className="input w-full"
                      placeholder="Enter email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => updateProfile({ phone: e.target.value })}
                      className="input w-full"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Home address</label>
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => updateProfile({ location: e.target.value })}
                      className="input w-full"
                      placeholder="Street, town, postcode"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={profile.role} />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Your role is set by a Super Admin. Shown as {roleDisplayName(profile.role)}.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {profile.status || "Active"}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Account status is managed by administrators on the Users page, you can’t change it here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-slate-900">Personal Info (Profiles)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Job Title</label>
                    <input
                      type="text"
                      value={extra.jobTitle}
                      onChange={(e) => updateExtra({ jobTitle: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., Site Operative"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={extra.emergencyContactName}
                      onChange={(e) => updateExtra({ emergencyContactName: e.target.value })}
                      className="input w-full"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={extra.emergencyContactPhone}
                      onChange={(e) => updateExtra({ emergencyContactPhone: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., 07xxxxxxxxx"
                    />
                    {!isValidUkPhone(extra.emergencyContactPhone) && extra.emergencyContactPhone && (
                      <div className="mt-1 text-xs text-red-600">Enter a valid UK phone (e.g., 07xxxxxxxxx or +447xxxxxxxxx)</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">NI Number</label>
                    <input
                      type="text"
                      inputMode="text"
                      value={extra.niNumber}
                      onChange={(e) => updateExtra({ niNumber: e.target.value.toUpperCase() })}
                      className={`input w-full ${showNi ? "" : "sensitive-disc"}`}
                      placeholder="e.g., QQ123456C"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      name="national-insurance-number"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                    />
                    {niAutofillWarning && (
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        The saved NI number was not a valid NI (often caused by a password manager filling this field). Please enter it again.
                      </div>
                    )}
                    {!isValidNi(extra.niNumber) && extra.niNumber && (
                      <div className="mt-1 text-xs text-red-600">Format should be two letters, six digits, and A–D (e.g., QQ123456C)</div>
                    )}
                    <span className="mt-1 relative inline-flex items-center group">
                      <button
                        type="button"
                        onClick={() => setShowNi((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                        aria-label={showNi ? "Hide NI in form" : "Show NI in form"}
                      >
                        {showNi ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showNi ? "Hide" : "Show"}
                      </button>
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {showNi ? "Hide NI (Form)" : "Show NI (Form)"}
                      </span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">UTR Number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={extra.utrNumber}
                      onChange={(e) => updateExtra({ utrNumber: e.target.value })}
                      className={`input w-full ${showUtr ? "" : "sensitive-disc"}`}
                      placeholder="10-digit UTR"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      name="unique-taxpayer-reference"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                    />
                    {utrAutofillWarning && (
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        The saved UTR was not a valid 10-digit number. Please enter it again.
                      </div>
                    )}
                    {!isValidUtr(extra.utrNumber) && extra.utrNumber && (
                      <div className="mt-1 text-xs text-red-600">UTR must be exactly 10 digits</div>
                    )}
                    <span className="mt-1 relative inline-flex items-center group">
                      <button
                        type="button"
                        onClick={() => setShowUtr((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                        aria-label={showUtr ? "Hide UTR in form" : "Show UTR in form"}
                      >
                        {showUtr ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showUtr ? "Hide" : "Show"}
                      </button>
                      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {showUtr ? "Hide UTR (Form)" : "Show UTR (Form)"}
                      </span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={
                        extra.dobYear && extra.dobMonth && extra.dobDay
                          ? `${extra.dobYear}-${extra.dobMonth}-${extra.dobDay}`
                          : ""
                      }
                      onChange={(e) => {
                        const [year = "", month = "", day = ""] = e.target.value.split("-");
                        updateExtra({ dobYear: year, dobMonth: month, dobDay: day });
                      }}
                    />
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Use Save Changes at the top of the page to save this section.
                </p>
              </div>

              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-4">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setIsDirty(true);
                    setNotes(e.target.value);
                  }}
                  className="input w-full rounded-xl"
                  rows={4}
                  placeholder="Internal notes regarding this user. No notes added for this user yet."
                />
              </div>
            </>
          )}

          {activeTab === "activity" && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-6">Activity Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 mb-1">Profile last updated</div>
                    <div className="font-medium text-slate-900">{profile.updatedAt ? formatDate(profile.updatedAt) : "Never"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "certifications" && userId && <ProfileCertificationsTab userId={userId} />}

          {activeTab === "induction" && preInductionUiEnabled && (
            <div className="card space-y-6">
              <h3 className="font-semibold text-slate-900">Pre-Induction &amp; Site Induction</h3>
              <p className="text-sm text-slate-600">
                Complete your pre-induction profile to meet site access requirements. This includes personal details, right to work documents, CSCS certifications, medical verification, training records, and declarations. Admins need to be inducted like operatives before accessing sites.
              </p>
              <SuperuserSelfOverrideSection role={sessionRole} />
              <div className="p-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ClipboardCheck className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Pre-induction profile</h4>
                      <p className="text-sm text-slate-600">Upload documents, view &amp; edit your induction details</p>
                    </div>
                  </div>
                  {userId && (
                    <Link
                      href={`/dashboard/users/${userId}/pre-induction`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      View &amp; Edit Pre-Induction
                      <ExternalLink size={16} />
                    </Link>
                  )}
                </div>
                {!userId && (
                  <p className="text-sm text-amber-600 mt-2">Loading your profile…</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <ProfilePrivacyTab
              userId={userId}
              restricted={extra.restrictNonEssentialProcessing}
              onRestrictedChange={(v) => setExtra((prev) => ({ ...prev, restrictNonEssentialProcessing: v }))}
            />
          )}

          {activeTab === "medical" && userId && (
            <ProfileMedicalTab userId={userId} onOpenInduction={() => setActiveTab("induction")} />
          )}
        </div>
      </div>

    </div>
  );
}
