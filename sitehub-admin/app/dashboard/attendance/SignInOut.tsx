"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

type User = { id: string; name?: string; email?: string };
type Site = { id: string; name?: string };

export default function SignInOut() {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState("IN");
  const [siteName, setSiteName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((json) => setUsers(json || []))
      .catch(() => setUsers([]));

    fetch("/api/sites")
      .then((r) => r.json())
      .then((json) => setSites(json || []))
      .catch(() => setSites([]));
  }, []);

  async function submit() {
    if (!selected) return alert("Select an operative");
    setLoading(true);
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operativeId: selected,
          name: users.find((u) => u.id === selected)?.name,
          email: users.find((u) => u.id === selected)?.email,
          siteId: siteId || undefined,
          siteName: siteName || (sites.find((s) => s.id === siteId)?.name ?? undefined),
          action,
          notes,
        }),
      });
      setNotes("");
      setSiteName("");
      setSiteId("");
      alert("Attendance recorded");
    } catch {
      alert("Error recording attendance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Record Attendance</h3>
        <p className="text-sm text-gray-600 mt-1">Sign operatives in or out of sites</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Operative</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">Select operative</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Select site (optional)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Site name (optional)"
            value={siteName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSiteName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 py-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="radio"
            checked={action === "IN"}
            onChange={() => setAction("IN")}
            className="w-4 h-4 text-blue-600 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Sign In</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="radio"
            checked={action === "OUT"}
            onChange={() => setAction("OUT")}
            className="w-4 h-4 text-blue-600 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Sign Out</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any extra details..."
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[80px] resize-none"
        />
      </div>
      <Button onClick={submit} disabled={loading} className="w-full">
        {loading ? "Recording..." : "Record Attendance"}
      </Button>
    </div>
  );
}
