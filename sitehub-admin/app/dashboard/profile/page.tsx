"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, Mail, Phone, MapPin, Calendar, Shield, FileText, Award, Settings, Upload, Eye, EyeOff, Download, Trash2, ClipboardCheck, ExternalLink } from "lucide-react";
import { Card } from "../components/ui/Card";
import PageHeader from "../components/PageHeader";
import { supabase } from "@/supabase/auth/client";
import { getUserEmailFromCookie, sanitizeEmail, getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import SuperuserSelfOverrideSection from "../induction-compliance/components/SuperuserSelfOverrideSection";
import Link from "next/link";

type TabType = "personal" | "activity" | "certifications" | "medical" | "induction" | "privacy";

type Certification = {
  id: string;
  name: string;
  description: string;
  cardNumber?: string;
  issuedDate?: string;
  expiryDate: string;
  status: "valid" | "expiring" | "expired";
  color: "emerald" | "blue" | "amber" | "red";
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
};

type MedicalRecord = {
  id: string;
  title?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt?: string;
};

// Constants - extracted to prevent recreation on every render
const DAYS = Array.from({length:31}, (_,i)=>String(i+1).padStart(2,'0'));
const MONTHS = [
  {v:'01',n:'Jan'},{v:'02',n:'Feb'},{v:'03',n:'Mar'},{v:'04',n:'Apr'},{v:'05',n:'May'},{v:'06',n:'Jun'},
  {v:'07',n:'Jul'},{v:'08',n:'Aug'},{v:'09',n:'Sep'},{v:'10',n:'Oct'},{v:'11',n:'Nov'},{v:'12',n:'Dec'},
];
const YEARS = Array.from({length: 90}, (_,i)=>String(new Date().getFullYear()-i));

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [medical, setMedical] = useState<MedicalRecord[]>([]);
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
  const [extraDocId, setExtraDocId] = useState<string | null>(null);
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
  function getDobParts(input: any): { d: string; m: string; y: string } {
    try {
      if (!input) return { d: "", m: "", y: "" };
      let dt: Date | null = null;
      if (typeof input?.toDate === 'function') dt = input.toDate();
      else if (typeof input?.seconds === 'number') dt = new Date(input.seconds * 1000);
      else if (input instanceof Date) dt = input;
      else if (typeof input === 'string') {
        const s = input.trim();
        const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const mUk = s.match(/^([0-3]?\d)[\/-]([01]?\d)[\/-](\d{4})$/);
        if (mIso) return { y: mIso[1], m: mIso[2], d: mIso[3] };
        if (mUk) return { d: mUk[1].padStart(2, '0'), m: mUk[2].padStart(2, '0'), y: mUk[3] };
        const p = Date.parse(s);
        if (!isNaN(p)) dt = new Date(p);
      }
      if (dt) {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = String(dt.getFullYear());
        return { d, m, y };
      }
    } catch {}
    return { d: "", m: "", y: "" };
  }

  const [showCertModal, setShowCertModal] = useState(false);
  const [certForm, setCertForm] = useState({
    name: "",
    description: "",
    cardNumber: "",
    issuedDate: "",
    expiryDate: "",
    file: null as File | null,
  });

  useEffect(() => {
    async function initializeProfile() {
      await loadProfileViaApi();
      await loadCertifications();
      await loadMedicalRecords();
    }
    initializeProfile();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeExtraProfile();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [userId]);

  async function loadCertifications() {
    try {
      const r = await fetch("/api/profiles/me", { credentials: "include" });
      const me = await r.json();
      const uid = me?.id || userId;
      if (!uid) return;
      const certRes = await fetch(`/api/certifications?userId=${encodeURIComponent(uid)}`, { credentials: "include" });
      const data = certRes.ok ? await certRes.json() : [];
      setCertifications((Array.isArray(data) ? data : []).map((d: any) => ({
        id: d.id,
        name: d.name || d.type,
        description: d.description || "",
        cardNumber: d.cardNumber,
        issuedDate: d.issuedDate || d.issued_at || d.issuedAt,
        expiryDate: d.expiryDate || d.expires_at || d.expiresAt,
        status: d.status || "valid",
        color: d.color || "emerald",
        fileUrl: d.fileUrl || d.attachment_url,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt || d.updated_at,
      })));
    } catch (error) {
      console.error("Error loading certifications:", error);
    }
  }

  async function loadMedicalRecords() {
    try {
      const r = await fetch("/api/profiles/me", { credentials: "include" });
      const me = await r.json();
      const uid = me?.id || userId;
      if (!uid) return;
      const medRes = await fetch(`/api/users/${encodeURIComponent(uid)}/medical`, { credentials: "include" });
      const data = medRes.ok ? await medRes.json() : [];
      setMedical((Array.isArray(data) ? data : []).map((d: any) => ({
        id: d.id,
        title: d.title,
        notes: d.notes,
        fileUrl: d.file_url || d.fileUrl,
        fileName: d.file_name || d.fileName,
        createdAt: d.created_at || d.createdAt,
      })));
    } catch (error) {
      console.error("Error loading medical records:", error);
    }
  }

  /** Load profile via /api/profiles/me - uses cookies, works for all roles (superuser + company admins). */
  async function loadProfileViaApi() {
    try {
      const r = await fetch("/api/profiles/me", { cache: "no-store", credentials: "include" });
      const json = await r.json();
      const data = Array.isArray(json) && json.length ? json[0] : null;
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
      setExtraDocId(profileUserId);
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
        emergencyContactPhone: String(data.emergencyContactPhone || data.emergencyPhone || data.emergencyContactNumber || "").trim(),
        niNumber: String(data.niNumber || data.nationalInsurance || "").trim(),
        utrNumber: String(data.utrNumber || data.utr || "").trim(),
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
  }

  /** Resolves userId from email. Used as fallback. */
  async function loadProfile(): Promise<string | undefined> {
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
  }

  /** Load personal info from profiles/users. Tries API first, then direct Supabase. */
  async function loadProfileData(profileUserId: string) {
    const applyData = (data: Record<string, unknown>) => {
      setExtraDocId(profileUserId);
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
      setExtra({
        jobTitle: String(data.jobTitle || "").trim(),
        emergencyContactName: String(data.emergencyContactName || "").trim(),
        emergencyContactPhone: emergPhone,
        niNumber: ni,
        utrNumber: utr,
        dobDay: d,
        dobMonth: m,
        dobYear: y,
        restrictNonEssentialProcessing: !!(data.restrictNonEssentialProcessing === true),
      });
    };

    try {
      // 1. Try API first (server-side)
      const r = await fetch(`/api/profiles?userId=${encodeURIComponent(profileUserId)}`, { cache: "no-store", credentials: "include" });
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
  }

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
      alert("User ID not found. Please refresh and try again.");
      console.error("Missing userId for profile save.");
      return;
    }

    if (profile.phone && !isValidUkPhone(profile.phone)) {
      alert("Please enter a valid UK phone number for your profile.");
      console.error("Invalid phone number:", profile.phone);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: effectiveUserId, email: profile.email, role: profile.role, status: profile.status, notes }),
      });

      alert("Profile saved successfully!");
      await loadProfileViaApi();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile: " + (error?.message || "Unknown error"));
      if (error?.code) alert("Error code: " + error.code);
    } finally {
      setSaving(false);
    }
  }

  async function loadExtraProfile() {
    await loadProfileViaApi();
  }

  /** Saves personal info to users/{userId}/profile/data via API (called from "Save Personal Info" button). */
  async function saveExtraProfile() {
    try {
      if (!userId) return;
      const day = extra.dobDay.padStart(2, "0");
      const month = extra.dobMonth.padStart(2, "0");
      const year = extra.dobYear;
      const dobIso = day && month && year ? `${year}-${month}-${day}` : "";
      const res = await fetch("/api/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          displayName: profile.name || profile.email || "",
          phone: profile.phone,
          bio: profile.bio,
          addressLine1: profile.location,
          jobTitle: extra.jobTitle || "",
          emergencyContactName: extra.emergencyContactName || "",
          emergencyContactPhone: extra.emergencyContactPhone || "",
          niNumber: extra.niNumber || "",
          utrNumber: extra.utrNumber || "",
          dateOfBirth: dobIso || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await loadProfileViaApi();
      alert("Personal info saved.");
    } catch (e) {
      console.error("Error saving extra profile:", e);
    }
  }

  function subscribeExtraProfile() {
    if (!userId) return () => {};
    const channel = supabase
      .channel(`profile-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` }, () => loadProfileViaApi())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }

  async function addCertification() {
    if (!userId) {
      alert("User not loaded. Please refresh the page.");
      return;
    }

    if (!certForm.name || !certForm.description || !certForm.expiryDate) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      let fileUrl = '';
      let fileName = '';
      if (certForm.file) {
        const formData = new FormData();
        formData.append("file", certForm.file);
        formData.append("userId", userId);
        const uploadRes = await fetch("/api/certifications/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err?.error || "Upload failed");
        }
        const uploadData = await uploadRes.json();
        fileUrl = uploadData.fileUrl || '';
        fileName = uploadData.fileName || certForm.file.name;
      }

      const res = await fetch("/api/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          name: certForm.name,
          description: certForm.description,
          cardNumber: certForm.cardNumber || '',
          issuedDate: certForm.issuedDate || '',
          expiryDate: certForm.expiryDate,
          fileUrl: fileUrl || undefined,
          fileName: fileName || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to add certification");
      }

      setCertForm({
        name: "",
        description: "",
        cardNumber: "",
        issuedDate: "",
        expiryDate: "",
        file: null,
      });
      setShowCertModal(false);

      alert("Certification added successfully!");
      await loadCertifications();
    } catch (error: any) {
      console.error("Error adding certification:", error);
      alert("Failed to add certification: " + (error?.message || error?.code || "Unknown error"));
    }
  }

  async function deleteCertification(certId: string) {
    if (!confirm("Are you sure you want to delete this certification?")) return;
    if (!userId) return;
    try {
      const res = await fetch("/api/certifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          path: `users/${userId}/certifications/${certId}`,
          parentCollection: "users",
          parentId: userId,
          id: certId,
        }),
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("Certification deleted successfully!");
      loadCertifications();
    } catch (error) {
      console.error("Error deleting certification:", error);
      alert("Failed to delete certification");
    }
  }

  async function handleFileUpload(certId: string, file: File) {
    if (!userId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      const uploadRes = await fetch("/api/certifications/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err?.error || "Upload failed");
      }
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.fileUrl;

      const patchRes = await fetch("/api/certifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          path: `users/${userId}/certifications/${certId}`,
          parentCollection: "users",
          parentId: userId,
          id: certId,
          attachmentUrl: fileUrl,
        }),
      });
      if (!patchRes.ok) throw new Error("Update failed");
      alert("File uploaded successfully!");
      loadCertifications();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    }
  }

  function triggerFileUpload(certId: string) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        handleFileUpload(certId, file);
      }
    };
    input.click();
  }

  const displayName = profile.name?.trim() || "User";
  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(n => n && n.trim());
    if (parts.length === 0) return 'U';
    return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [displayName]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account information and preferences"
        action={
          <button onClick={handleSave} className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        }
      />

      {/* Tabs */}
      <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab("personal")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "medical" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <FileText size={16} />
          Medical History
        </button>
        <button
          onClick={() => setActiveTab("induction")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "induction" 
              ? "bg-blue-600 text-white shadow-sm" 
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <ClipboardCheck size={16} />
          Induction
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className="rounded-full bg-gradient-to-br from-[#58a5f0] to-[#2d8ae8] flex items-center justify-center font-bold shadow-lg"
                style={{ width: '100px', height: '100px', fontSize: '20px', color: '#ffffff' }}
              >
                {initials}
              </div>
              <div className="w-full">
                <h3 className="font-semibold text-slate-900 text-lg">{displayName}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{profile.role}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
              <h4 className="font-semibold text-slate-900 text-sm">Personal Information</h4>
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
                      ? new Date(profile.joinedDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
                  <span className="text-slate-500">Location</span>
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
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="input w-full"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="input w-full"
                      placeholder="Enter email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="input w-full"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="input w-full"
                      placeholder="Enter location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                    <select
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      className="input w-full"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="OPERATIVE">Operative</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={profile.status}
                      onChange={(e) => setProfile({ ...profile, status: e.target.value })}
                      className="input w-full"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </select>
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
                      onChange={(e) => setExtra({ ...extra, jobTitle: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., Site Operative"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={extra.emergencyContactName}
                      onChange={(e) => setExtra({ ...extra, emergencyContactName: e.target.value })}
                      className="input w-full"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={extra.emergencyContactPhone}
                      onChange={(e) => setExtra({ ...extra, emergencyContactPhone: e.target.value })}
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
                      type={showNi ? "text" : "password"}
                      value={extra.niNumber}
                      onChange={(e) => setExtra({ ...extra, niNumber: e.target.value.toUpperCase() })}
                      className="input w-full"
                      placeholder="e.g., QQ123456C"
                      autoComplete="off"
                    />
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
                      type={showUtr ? "text" : "password"}
                      value={extra.utrNumber}
                      onChange={(e) => setExtra({ ...extra, utrNumber: e.target.value })}
                      className="input w-full"
                      placeholder="10-digit UTR"
                      autoComplete="off"
                    />
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
                    <div className="flex gap-2">
                      <select
                        className="input w-20"
                        value={extra.dobDay}
                        onChange={(e)=>setExtra({...extra, dobDay: e.target.value})}
                      >
                        <option value="">DD</option>
                        {DAYS.map(d=>(<option key={d} value={d}>{d}</option>))}
                      </select>
                      <select
                        className="input w-28"
                        value={extra.dobMonth}
                        onChange={(e)=>setExtra({...extra, dobMonth: e.target.value})}
                      >
                        <option value="">MM</option>
                        {MONTHS.map(m=>(<option key={m.v} value={m.v}>{m.n}</option>))}
                      </select>
                      <select
                        className="input w-28"
                        value={extra.dobYear}
                        onChange={(e)=>setExtra({...extra, dobYear: e.target.value})}
                      >
                        <option value="">YYYY</option>
                        {YEARS.map(y=>(<option key={y} value={y}>{y}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => {
                      if (extra.emergencyContactPhone && !isValidUkPhone(extra.emergencyContactPhone)) { alert('Please enter a valid UK phone number.'); return; }
                      if (extra.niNumber && !isValidNi(extra.niNumber)) { alert('Please enter a valid NI number (e.g., QQ123456C).'); return; }
                      if (extra.utrNumber && !isValidUtr(extra.utrNumber)) { alert('Please enter a valid 10-digit UTR.'); return; }
                      saveExtraProfile();
                    }}
                    className="button"
                  >
                    Save Personal Info
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-4">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                    <div className="text-slate-500 mb-1">Last Activities/Log in</div>
                    <div className="font-medium text-slate-900">2 days ago</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Update Billing Information</div>
                    <div className="font-medium text-slate-900">1 week ago</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">View Recent Record</div>
                    <div className="font-medium text-slate-900">1 day ago</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Profile Updates</div>
                    <div className="font-medium text-slate-900">{profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Never"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "certifications" && (
            <>
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-6">Professional Certification & Training</h3>
                {certifications.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Award size={24} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 mb-4">No certifications added yet</p>
                    <button onClick={() => setShowCertModal(true)} className="button">
                      + Add Your First Certification
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {certifications.map((cert) => (
                        <div 
                          key={cert.id}
                          className={`p-4 rounded-xl border ${
                            cert.status === 'expired' ? 'border-red-200 bg-red-50' :
                            cert.status === 'expiring' ? 'border-amber-200 bg-amber-50' :
                            'border-gray-100 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                cert.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                                cert.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                cert.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                                <Award size={18} />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{cert.name}</div>
                                <div className="text-sm text-slate-500">{cert.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                cert.status === 'expired' ? 'bg-red-200 text-red-800' :
                                cert.status === 'expiring' ? 'bg-amber-200 text-amber-800' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  cert.status === 'expired' ? 'bg-red-500' :
                                  cert.status === 'expiring' ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}></span>
                                {cert.status === 'expired' ? 'Expired' :
                                 cert.status === 'expiring' ? 'Expiring Soon' :
                                 'Valid'}
                              </span>
                              <button 
                                onClick={() => deleteCertification(cert.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete certification"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            {cert.cardNumber && (
                              <div>
                                <div className="text-slate-500">Card Number</div>
                                <div className="font-medium text-slate-900">{cert.cardNumber}</div>
                              </div>
                            )}
                            {cert.issuedDate && (
                              <div>
                                <div className="text-slate-500">Issued</div>
                                <div className="font-medium text-slate-900">
                                  {new Date(cert.issuedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="text-slate-500">Expires</div>
                              <div className={`font-medium ${
                                cert.status === 'expired' ? 'text-red-700' :
                                cert.status === 'expiring' ? 'text-amber-700' :
                                'text-slate-900'
                              }`}>
                                {new Date(cert.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-200">
                            {cert.fileUrl && cert.fileName ? (
                              <div className="flex items-center justify-between">
                                <a
                                  href={cert.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  <FileText size={14} />
                                  {cert.fileName}
                                  <span className="text-slate-400">↗</span>
                                </a>
                                <button
                                  onClick={() => triggerFileUpload(cert.id)}
                                  className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                  Replace
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => triggerFileUpload(cert.id)}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all"
                              >
                                <Upload size={14} />
                                Upload Evidence
                              </button>
                            )}
                            {cert.uploadedAt && (
                              <div className="text-xs text-slate-400 mt-1">
                                Uploaded {new Date(cert.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <button onClick={() => setShowCertModal(true)} className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all">
                        + Add New Certification
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {activeTab === "induction" && (
            <div className="card space-y-6">
              <h3 className="font-semibold text-slate-900">Pre-Induction &amp; Site Induction</h3>
              <p className="text-sm text-slate-600">
                Complete your pre-induction profile to meet site access requirements. This includes personal details, right to work documents, CSCS certifications, medical verification, training records, and declarations. Admins need to be inducted like operatives before accessing sites.
              </p>
              <SuperuserSelfOverrideSection role={getRoleFromClient()} />
              <div className="p-6 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ClipboardCheck className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Pre-Induction Profile</h4>
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
            <div className="card space-y-6">
              <h3 className="font-semibold text-slate-900">GDPR — Your Data Rights</h3>
              <p className="text-sm text-slate-600">
                Your data is collected solely for the purposes of site access, safety compliance, induction, RAMS acceptance, and legal health &amp; safety obligations. It is not used for marketing or profiling.
              </p>
              <p className="text-xs text-slate-500">
                <a href="/legal/privacy-and-security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Full Privacy & Security Policy</a>
              </p>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <h4 className="font-medium text-slate-900 mb-2">Right to Restrict Processing</h4>
                <p className="text-sm text-slate-600 mb-3">When enabled, only admins can view sensitive fields (NI number, medical notes).</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extra.restrictNonEssentialProcessing}
                    onChange={async (e) => {
                      const v = e.target.checked;
                      setExtra((prev) => ({ ...prev, restrictNonEssentialProcessing: v }));
                      try {
                        const r = await fetch("/api/profiles", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId, restrictNonEssentialProcessing: v }),
                          credentials: "include",
                        });
                        if (!r.ok) throw new Error("Failed to save");
                      } catch (err) {
                        setExtra((prev) => ({ ...prev, restrictNonEssentialProcessing: !v }));
                        alert("Failed to update setting");
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">Restrict non-essential processing</span>
                </label>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <h4 className="font-medium text-slate-900 mb-2">Right to Access</h4>
                  <p className="text-sm text-slate-600 mb-3">Download a copy of your Pre-Induction, Induction, and Profile data.</p>
                  <button
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/gdpr/download-my-data", { credentials: "include" });
                        if (!r.ok) throw new Error("Failed to download");
                        const json = await r.json();
                        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `my-data-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                        alert("Data downloaded.");
                      } catch (e) {
                        alert("Failed to download: " + (e instanceof Error ? e.message : "Unknown error"));
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    <Download size={16} />
                    Download My Data
                  </button>
                </div>
                <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                  <h4 className="font-medium text-slate-900 mb-2">Right to Erasure</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Delete your account and personal data. Legally required H&S records (inductions, RAMS acceptance, training) will be retained for compliance.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm("Are you sure? This will anonymise your account. H&S records will be retained.")) return;
                      try {
                        const r = await fetch("/api/gdpr/delete-account", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ confirm: true }),
                          credentials: "include",
                        });
                        const data = await r.json().catch(() => ({}));
                        if (!r.ok) throw new Error(data.error || "Failed");
                        alert(data.message || "Account deleted.");
                        window.location.href = "/login";
                      } catch (e) {
                        alert("Failed: " + (e instanceof Error ? e.message : "Unknown error"));
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                  >
                    <Trash2 size={16} />
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "medical" && (
            <>
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-6">Medical History</h3>
                {medical.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <FileText size={24} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 mb-2">No medical records found</p>
                    <p className="text-sm text-slate-400">Medical records are managed by administrators in the Operatives section</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medical.map((record) => (
                      <div 
                        key={record.id}
                        className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <FileText size={18} />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{record.title || 'Medical Record'}</div>
                              {record.createdAt && (
                                <div className="text-xs text-slate-500">
                                  {new Date(record.createdAt).toLocaleDateString('en-GB', { 
                                    day: 'numeric', 
                                    month: 'short', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {record.notes && (
                          <div className="mb-3">
                            <div className="text-sm text-slate-600">{record.notes}</div>
                          </div>
                        )}
                        {record.fileUrl && record.fileName && (
                          <div className="pt-3 border-t border-gray-100">
                            <a
                              href={record.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <FileText size={14} />
                              {record.fileName}
                              <span className="text-slate-400">↗</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add Certification</h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Certification Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., CSCS Card"
                  value={certForm.name}
                  onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Construction Skills Certification Scheme"
                  value={certForm.description}
                  onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Card Number (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 12345678"
                  value={certForm.cardNumber}
                  onChange={(e) => setCertForm({ ...certForm, cardNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Issued Date (optional)
                  </label>
                  <input
                    type="date"
                    value={certForm.issuedDate}
                    onChange={(e) => setCertForm({ ...certForm, issuedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={certForm.expiryDate}
                    onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload Document/Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setCertForm({ ...certForm, file: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {certForm.file && (
                  <p className="text-xs text-slate-500 mt-1">
                    Selected: {certForm.file.name}
                  </p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
              <button
                onClick={() => setShowCertModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addCertification}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                Add Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
