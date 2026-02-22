"use client";

import { useState } from "react";
import toast from "react-hot-toast";

function getStr(d: Record<string, unknown> | null, k: string): string {
  const v = d?.[k];
  return v != null ? String(v) : "";
}

interface PreInductionSectionPersonalProps {
  userId: string;
  data: Record<string, unknown> | null;
  onSaved?: () => void;
}

export default function PreInductionSectionPersonal({
  userId,
  data,
  onSaved,
}: PreInductionSectionPersonalProps) {
  const [form, setForm] = useState({
    fullName: getStr(data, "fullName"),
    dateOfBirth: getStr(data, "dateOfBirth"),
    nationalInsuranceNumber: getStr(data, "nationalInsuranceNumber"),
    phone: getStr(data, "phone"),
    email: getStr(data, "email"),
    address: getStr(data, "address"),
    emergencyContactName: getStr(data, "emergencyContactName"),
    emergencyContactRelationship: getStr(data, "emergencyContactRelationship"),
    emergencyContactPhone: getStr(data, "emergencyContactPhone"),
    employerCompanyId: getStr(data, "employerCompanyId"),
    supervisorName: getStr(data, "supervisorName"),
    trade: getStr(data, "trade"),
    jobRole: getStr(data, "jobRole"),
    utrNumber: getStr(data, "utrNumber"),
    payrollNumber: getStr(data, "payrollNumber"),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pre-induction/${userId}/personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, updatedAt: new Date().toISOString() }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      toast.success("Personal section saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of birth (optional)</label>
          <input
            type="date"
            value={form.dateOfBirth?.slice(0, 10) ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">National Insurance Number (optional)</label>
          <input
            type="text"
            value={form.nationalInsuranceNumber}
            onChange={(e) => setForm((f) => ({ ...f, nationalInsuranceNumber: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="AB123456C"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Address (optional — only if required by contractor)</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            rows={2}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="border-t border-gray-200 pt-4 sm:col-span-2">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-gray-500">Name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Relationship</label>
              <input
                type="text"
                value={form.emergencyContactRelationship}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emergencyContactRelationship: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Phone</label>
              <input
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Employer Company ID</label>
          <input
            type="text"
            value={form.employerCompanyId}
            onChange={(e) => setForm((f) => ({ ...f, employerCompanyId: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Supervisor Name</label>
          <input
            type="text"
            value={form.supervisorName}
            onChange={(e) => setForm((f) => ({ ...f, supervisorName: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Trade</label>
          <input
            type="text"
            value={form.trade}
            onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Job Role</label>
          <input
            type="text"
            value={form.jobRole}
            onChange={(e) => setForm((f) => ({ ...f, jobRole: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">UTR Number (optional)</label>
          <input
            type="text"
            value={form.utrNumber}
            onChange={(e) => setForm((f) => ({ ...f, utrNumber: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Payroll Number (optional)</label>
          <input
            type="text"
            value={form.payrollNumber}
            onChange={(e) => setForm((f) => ({ ...f, payrollNumber: e.target.value }))}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          style={{ backgroundColor: "#2563EB" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
