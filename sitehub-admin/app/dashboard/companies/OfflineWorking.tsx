"use client";

import React, { useEffect, useState } from "react";
import Button from "../components/ui/Button";

interface OfflineItem {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
  synced_at?: string | null;
}

export default function OfflineWorking({ companyId }: { companyId: string }) {
  const [syncedItems, setSyncedItems] = useState<OfflineItem[]>([]);
  const [pendingItems, setPendingItems] = useState<OfflineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  async function fetchData() {
    setLoading(true);
    try {
      const [syncedRes, pendingRes] = await Promise.all([
        fetch("/api/offline/synced"),
        fetch("/api/offline/pending"),
      ]);
      const synced = await syncedRes.json();
      const pending = await pendingRes.json();
      setSyncedItems(Array.isArray(synced) ? synced : []);
      setPendingItems(Array.isArray(pending) ? pending : []);
    } catch {
      setSyncedItems([]);
      setPendingItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [companyId]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function markAsSynced() {
    if (pendingItems.length === 0) return;
    try {
      await fetch("/api/offline/mark-synced", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingItems.map((p) => p.id) }),
      });
      await fetchData();
    } catch (e) {
      console.error("mark-synced failed:", e);
    }
  }

  const unsyncedCount = pendingItems.length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Offline Working</h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
              online ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`} />
            {online ? "Online" : "Offline"}
          </span>
          {unsyncedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-amber-500 text-white text-sm font-semibold rounded-full">
              {unsyncedCount}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 text-sm py-8 text-center">Loading...</div>
      ) : (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Synced items</h4>
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 bg-slate-50 dark:bg-slate-800">
              {syncedItems.length === 0 ? (
                <div className="text-slate-400 dark:text-slate-500 text-sm">No synced items yet.</div>
              ) : (
                syncedItems.map((item) => (
                  <div key={item.id} className="mb-2 py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="font-medium text-blue-700 dark:text-blue-400">{item.type}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                      {new Date(item.synced_at ?? item.created_at).toLocaleString()}
                    </span>
                    <pre className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(item.payload)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>

          {unsyncedCount > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">Pending ({unsyncedCount})</h4>
              <div className="max-h-32 overflow-y-auto border border-amber-200 dark:border-amber-800 rounded-lg p-2 bg-amber-50 dark:bg-amber-900/30">
                {pendingItems.map((item) => (
                  <div key={item.id} className="mb-2 py-1">
                    <span className="font-medium">{item.type}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <Button onClick={markAsSynced} variant="primary" className="mt-2">
                Mark as Synced
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
