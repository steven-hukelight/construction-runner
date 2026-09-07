"use client";

import { useState, useEffect, useCallback } from "react";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import { Truck, Plus, Trash2 } from "lucide-react";

export default function HaulageManager() {
  const [list, setList] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const companyId = getCompanyIdFromClient();

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/deliveries/haulage?companyId=${encodeURIComponent(companyId)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open && companyId) void load();
  }, [open, companyId, load]);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/deliveries/haulage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      if (res.ok) {
        setNewName("");
        load();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add");
      }
    } catch {
      alert("Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this haulage/wholesaler?")) return;
    try {
      const res = await fetch(`/api/deliveries/haulage/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) load();
    } catch {
      alert("Failed to delete");
    }
  }

  if (!companyId) return null;

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
      >
        <Truck className="w-5 h-5" />
        <span className="font-medium">
          Haulage / Wholesalers ({list.length})
        </span>
        <span className="text-slate-400 text-sm">
          {open ? "▼" : "▶"}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            Manage haulage and wholesaler options for this company. These appear in the mobile app dropdown when recording deliveries.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Medlocks, Edmunsons"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-500">
              No haulage/wholesalers yet. Add one above.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {list.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
