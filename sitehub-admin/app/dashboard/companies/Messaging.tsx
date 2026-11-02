"use client";
import toast from "react-hot-toast";

import React, { useState, useCallback } from "react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { usePolling } from "@/lib/hooks/usePolling";
import Button from "../components/ui/Button";

const MESSAGE_REFRESH_MS = 10_000;

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

export default function Messaging({ companyId, canDelete = false }: { companyId: string; canDelete?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMessages = useCallback(
    async (signal: AbortSignal) => {
      const res = await fetch(`/api/companies/${companyId}/messages`, { signal });
      if (!res.ok) throw new Error(`messages ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    },
    [companyId],
  );
  const refreshMessages = usePolling(fetchMessages, MESSAGE_REFRESH_MS);

  async function deleteMessage(messageId: string) {
    if (!canDelete) return;
    setDeletingId(messageId);
    try {
      const res = await fetch(`/api/companies/${companyId}/messages/${messageId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to delete message");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to send message");
        return;
      }
      setNewMessage("");
      refreshMessages();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Company Messaging</h3>
      <div className="max-h-64 overflow-y-auto mb-4 border rounded p-2 bg-slate-50">
        {messages.length === 0 ? (
          <div className="text-slate-400 text-sm">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-2 group">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-700">{msg.sender}</span>
                <span className="text-xs text-slate-400">{formatDateTime(msg.timestamp)}</span>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => deleteMessage(msg.id)}
                    disabled={deletingId === msg.id}
                    className="text-red-500 hover:text-red-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Delete message"
                  >
                    {deletingId === msg.id ? "…" : "Delete"}
                  </button>
                )}
              </div>
              <div className="ml-0 mt-0.5 text-slate-800">{msg.content}</div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
