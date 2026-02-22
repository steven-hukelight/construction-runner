"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useRouter } from "next/navigation";
import { createNotice } from "./actions";

export default function AddNoticeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    siteId: "",
  });

  async function handleSubmit() {
    await createNotice(form);
    setOpen(false);
    setForm({ title: "", body: "", siteId: "" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Add Notice"}
      </Button>
      {open && (
        <div className="card w-full md:max-w-xl">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6">Add Notice</h3>
          <div className="space-y-4 sm:space-y-5">
            <Input
              label="Title"
              value={form.title}
              onChange={(e: any) => setForm({ ...form, title: e.target.value })}
            />

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">Body</label>
              <textarea
                className="input w-full min-h-[120px] resize-y"
                value={form.body}
                onChange={(e: any) => setForm({ ...form, body: e.target.value })}
              />
            </div>

            <Input
              label="Site ID (optional)"
              value={form.siteId}
              onChange={(e: any) => setForm({ ...form, siteId: e.target.value })}
            />

            <div className="pt-2">
              <Button onClick={handleSubmit} className="w-full">
                Save Notice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
