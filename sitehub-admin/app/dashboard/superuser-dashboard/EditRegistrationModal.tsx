"use client";
import { useState, type ChangeEvent } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export type Registration = {
  id: string;
  name?: string;
  email?: string;
  companyName?: string;
};

type EditRegistrationModalProps = {
  registration: Registration;
  onClose: () => void;
  onSave: (updated: Partial<Registration>) => void;
};

export default function EditRegistrationModal({ registration, onClose, onSave }: EditRegistrationModalProps) {
  const [form, setForm] = useState({
    name: registration.name || "",
    email: registration.email || "",
    companyName: registration.companyName || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      await fetch(`/api/registrations/${registration.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSave(form);
      onClose();
    } catch {
      setError("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full md:max-w-md mt-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Edit Registration</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
      </div>
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" value={form.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })} />
        <Input label="Company Name" value={form.companyName} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, companyName: e.target.value })} />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="flex-1" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
