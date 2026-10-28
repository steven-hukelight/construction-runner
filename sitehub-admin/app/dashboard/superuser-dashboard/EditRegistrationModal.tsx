"use client";
import { useState, type ChangeEvent } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";

export type Registration = {
  id: string;
  name?: string;
  email?: string;
  companyName?: string;
  role?: string;
  status?: string;
  needsEmailVerification?: boolean;
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
      const res = await fetch(`/api/registrations/${registration.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to save changes.");
        return;
      }
      onSave(form);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Edit registration" onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Email"
          value={form.email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Company Name"
          value={form.companyName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, companyName: e.target.value })}
        />
        {error && (
          <div className="text-sm text-red-600" role="alert">
            {error}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} className="flex-1" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
