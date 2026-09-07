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
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to submit form");
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
      console.error("Form submission error:", err);
      setSubmitStatus("error");
      setSubmitMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl max-w-md w-full border border-slate-700/50 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-2xl font-bold text-white">Request a Demo</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {submitStatus === "success" && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-200 text-center">
              {submitMessage}
            </div>
          )}
          {submitStatus === "error" && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-200 text-center">
              {submitMessage}
            </div>
          )}
          {submitStatus === "idle" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="John Doe"
                />
                {errors.fullName && (
                  <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Your Company"
                />
                {errors.company && (
                  <p className="text-red-400 text-xs mt-1">{errors.company}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Role <span className="text-red-400">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="">Select a role</option>
                  <option value="Manager">Manager</option>
                  <option value="Director">Director</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Other">Other</option>
                </select>
                {errors.role && (
                  <p className="text-red-400 text-xs mt-1">{errors.role}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Number of Sites <span className="text-red-400">*</span>
                </label>
                <select
                  name="sites"
                  value={formData.sites}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="">Select number of sites</option>
                  <option value="1">1 Site</option>
                  <option value="2-5">2-5 Sites</option>
                  <option value="6-10">6-10 Sites</option>
                  <option value="10+">10+ Sites</option>
                </select>
                {errors.sites && (
                  <p className="text-red-400 text-xs mt-1">{errors.sites}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Message{" "}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors resize-none h-24"
                  placeholder="Tell us about your needs..."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
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
