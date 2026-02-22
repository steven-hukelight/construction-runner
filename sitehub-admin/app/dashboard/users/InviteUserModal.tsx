"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { inviteUser } from "./actions";

export default function InviteUserModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "OPERATIVE",
  });

  async function handleSubmit() {
    await inviteUser(form);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Invite User"}
      </Button>
      {open && (
        <div className="card w-full md:max-w-xl">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Invite User</h3>
          <div className="space-y-4 sm:space-y-5">
            <Input
              label="Name"
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(e: any) => setForm({ ...form, email: e.target.value })}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Role</label>
              <select
                className="input w-full bg-transparent"
                value={form.role}
                onChange={(e: any) => setForm({ ...form, role: e.target.value })}
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="OPERATIVE">Operative</option>
              </select>
            </div>

            <div className="pt-2">
              <Button onClick={handleSubmit} className="w-full">
                Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
