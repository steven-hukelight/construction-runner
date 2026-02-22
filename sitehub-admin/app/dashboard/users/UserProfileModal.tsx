"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { updateProfile } from "./profileActions";

export default function UserProfileModal({ profile, onClose, onUpdate }: any) {
  const [form, setForm] = useState({
    displayName: profile?.displayName || "",
    phone: profile?.phone || "",
    avatar: profile?.avatar || "",
    bio: profile?.bio || "",
    addressLine1: profile?.addressLine1 || "",
    town: profile?.town || "",
    postcode: profile?.postcode || "",
    jobTitle: profile?.jobTitle || "",
    emergencyContactName: profile?.emergencyContactName || "",
    emergencyContactPhone: profile?.emergencyContactPhone || "",
    nationalInsurance: profile?.nationalInsurance || "",
    utr: profile?.utr || "",
    dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth.seconds ? profile.dateOfBirth.seconds * 1000 : profile.dateOfBirth) : null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!profile?.id) {
      setError("Profile not found");
      return;
    }

    try {
      setLoading(true);
      await updateProfile(profile.id, {
        userId: profile.id,
        companyId: profile.companyId || "",
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        avatar: form.avatar.trim(),
        bio: form.bio.trim(),
        addressLine1: form.addressLine1.trim(),
        town: form.town.trim(),
        postcode: form.postcode.trim(),
        jobTitle: form.jobTitle.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        nationalInsurance: form.nationalInsurance.trim(),
        utr: form.utr.trim(),
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth.toISOString() } : {}),
      });
      onUpdate();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full md:max-w-xl mt-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">User Profile</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <Input
          label="Display Name"
          value={form.displayName}
          onChange={(e: any) => setForm({ ...form, displayName: e.target.value })}
        />

        <Input
          label="Phone"
          value={form.phone}
          onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
        />

        <Input
          label="Avatar URL"
          value={form.avatar}
          onChange={(e: any) => setForm({ ...form, avatar: e.target.value })}
        />

        <Input
          label="Bio"
          value={form.bio}
          onChange={(e: any) => setForm({ ...form, bio: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Address Line 1"
            value={form.addressLine1}
            onChange={(e: any) => setForm({ ...form, addressLine1: e.target.value })}
          />
          <Input
            label="Town/City"
            value={form.town}
            onChange={(e: any) => setForm({ ...form, town: e.target.value })}
          />
          <Input
            label="Postcode"
            value={form.postcode}
            onChange={(e: any) => setForm({ ...form, postcode: e.target.value })}
          />
          <Input
            label="Job Title"
            value={form.jobTitle}
            onChange={(e: any) => setForm({ ...form, jobTitle: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Next of Kin (Name)"
            value={form.emergencyContactName}
            onChange={(e: any) => setForm({ ...form, emergencyContactName: e.target.value })}
          />
          <Input
            label="Next of Kin (Phone)"
            value={form.emergencyContactPhone}
            onChange={(e: any) => setForm({ ...form, emergencyContactPhone: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="NI Number"
            value={form.nationalInsurance}
            onChange={(e: any) => setForm({ ...form, nationalInsurance: e.target.value })}
          />
          <Input
            label="UTR"
            value={form.utr}
            onChange={(e: any) => setForm({ ...form, utr: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
          <input
            type="date"
            className="input w-full"
            value={form.dateOfBirth ? new Date(form.dateOfBirth).toISOString().slice(0, 10) : ""}
            onChange={(e: any) => setForm({ ...form, dateOfBirth: e.target.value ? new Date(e.target.value) : null })}
          />
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
