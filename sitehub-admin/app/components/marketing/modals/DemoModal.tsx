"use client";

import React, { useRef, useEffect, useState } from "react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  fullName: string;
  company: string;
  email: string;
  role: string;
  sites: string;
  message: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function DemoModal({
  isOpen,
  onClose,
  onSuccess,
}: DemoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    company: "",
    email: "",
    role: "",
    sites: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleBackdropClick = (e: MouseEvent) => {
      if (modalRef.current && e.target === modalRef.current) onClose();
    };
    if (isOpen) window.addEventListener("mousedown", handleBackdropClick);
    return () => window.removeEventListener("mousedown", handleBackdropClick);
  }, [isOpen, onClose]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.company.trim())
      newErrors.company = "Company name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Please enter a valid email";
    if (!formData.role) newErrors.role = "Please select a role";
    if (!formData.sites) newErrors.sites = "Please select number of sites";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitStatus("idle");
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, website }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((json as { error?: string }).error || "Failed to submit form");
      }
      setSubmitStatus("success");
      setSubmitMessage("Thank you! We will contact you soon.");
      setFormData({
        fullName: "",
        company: "",
        email: "",
        role: "",
        sites: "",
        message: "",
      });
      if (onSuccess) setTimeout(onSuccess, 2000);
      setTimeout(() => {
        onClose();
        setSubmitStatus("idle");
      }, 3000);
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const fieldClass =
    "w-full rounded-xl border border-blue-100 bg-[#f7fafc] px-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-blue-100/80 bg-white shadow-[0_16px_40px_rgba(37,76,128,0.16)]">
        <div className="flex items-center justify-between border-b border-blue-100/80 p-6">
          <h2 className="text-xl font-semibold text-slate-900">Request a Demo</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 transition-colors hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {submitStatus === "success" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800">
              {submitMessage}
            </div>
          )}
          {submitStatus === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
              {submitMessage}
            </div>
          )}
          {submitStatus === "idle" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
                <label>
                  Website
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={fieldClass}
                  placeholder="John Doe"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className={fieldClass}
                  placeholder="Your Company"
                />
                {errors.company && (
                  <p className="mt-1 text-xs text-red-600">{errors.company}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={fieldClass}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={fieldClass}
                >
                  <option value="">Select a role</option>
                  <option value="Manager">Manager</option>
                  <option value="Director">Director</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Other">Other</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-xs text-red-600">{errors.role}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Number of Sites <span className="text-red-500">*</span>
                </label>
                <select
                  name="sites"
                  value={formData.sites}
                  onChange={handleInputChange}
                  className={fieldClass}
                >
                  <option value="">Select number of sites</option>
                  <option value="1">1 Site</option>
                  <option value="2-5">2-5 Sites</option>
                  <option value="6-10">6-10 Sites</option>
                  <option value="10+">10+ Sites</option>
                </select>
                {errors.sites && (
                  <p className="mt-1 text-xs text-red-600">{errors.sites}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Message <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`${fieldClass} h-24 resize-none`}
                  placeholder="Tell us about your needs..."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Request Demo"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
