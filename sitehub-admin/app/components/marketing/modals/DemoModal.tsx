"use client";

import React, { useState } from "react";
import Modal from "@/app/dashboard/components/ui/Modal";
import Button from "@/app/dashboard/components/ui/Button";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  fullName: string;
  company: string;
  email: string;
  message: string;
}

export default function DemoModal({ isOpen, onClose, onSuccess }: DemoModalProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    company: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const fieldClass =
    "w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 outline-none transition-colors duration-[120ms] focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function validateForm(): boolean {
    const next: Record<string, string> = {};
    if (!formData.fullName.trim()) next.fullName = "Full name is required";
    if (!formData.company.trim()) next.company = "Company name is required";
    if (!formData.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = "Enter a valid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
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
        throw new Error((json as { error?: string }).error || "Could not send request");
      }
      setSubmitStatus("success");
      setSubmitMessage("Thanks. We will be in touch.");
      setFormData({ fullName: "", company: "", email: "", message: "" });
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
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Request a demo">
      {submitStatus === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
          {submitMessage}
        </div>
      )}
      {submitStatus === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          {submitMessage}
        </div>
      )}
      {submitStatus === "idle" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="demo-full-name" className={labelClass}>
              Full name
            </label>
            <input
              id="demo-full-name"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={fieldClass}
              autoComplete="name"
            />
            {errors.fullName ? <p className="mt-1 text-xs text-red-600">{errors.fullName}</p> : null}
          </div>
          <div>
            <label htmlFor="demo-company" className={labelClass}>
              Company
            </label>
            <input
              id="demo-company"
              type="text"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              className={fieldClass}
              autoComplete="organization"
            />
            {errors.company ? <p className="mt-1 text-xs text-red-600">{errors.company}</p> : null}
          </div>
          <div>
            <label htmlFor="demo-email" className={labelClass}>
              Email
            </label>
            <input
              id="demo-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={fieldClass}
              autoComplete="email"
            />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
          </div>
          <div>
            <label htmlFor="demo-message" className={labelClass}>
              Message <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="demo-message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              className={`${fieldClass} h-24 resize-none`}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Request a demo"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
