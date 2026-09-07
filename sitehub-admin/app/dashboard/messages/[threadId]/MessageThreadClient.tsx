"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { Check, CheckCheck } from "lucide-react";
import Button from "../../components/ui/Button";

interface Message {
  id: string;
  senderId: string;
  sender_name?: string | null;
  body: string;
  attachmentUrl?: string | null;
  createdAt: string;
  read?: boolean;
}

export default function MessageThreadClient({ threadId, companyId, canDelete = false }: { threadId: string; companyId: string; canDelete?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const res = await fetch(`/api/messages/thread/${threadId}${q}`);
      const data = await res.json();
      setMessages(data?.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, threadId]);

  async function deleteMessage(messageId: string) {
    if (!canDelete) return;
    setDeletingId(messageId);
    try {
      const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const res = await fetch(`/api/messages/thread/${threadId}/message/${messageId}${q}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Failed to delete message");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteThread() {
    if (!canDelete) return;
    if (!confirm("Delete this entire thread? This cannot be undone.")) return;
    setDeletingThread(true);
    try {
      const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
      const res = await fetch(`/api/messages/thread/${threadId}${q}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        window.location.href = "/dashboard/messaging";
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Failed to delete thread");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete thread");
    } finally {
      setDeletingThread(false);
    }
  }

  async function archiveThread() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/messages/thread/${threadId}/archive`, { method: "POST", credentials: "include" });
      if (res.ok) {
        window.history.back();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error ?? "Failed to archive");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to archive thread");
    } finally {
      setArchiving(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const MESSAGE_REFRESH_SEC = 3;
  useEffect(() => {
    const id = setInterval(() => void load(), MESSAGE_REFRESH_SEC * 1000);
    return () => clearInterval(id);
  }, [load]);

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/messages/send?companyId=${encodeURIComponent(companyId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId, body: newMessage.trim() }),
      });
      setNewMessage("");
      void load();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  if (loading && messages.length === 0) {
    return <div className="text-slate-500 py-12 text-center">Loading thread...</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
        <Link href="/dashboard/messaging">
          <Button variant="secondary" size="sm">← Back</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={archiveThread} disabled={archiving}>
            {archiving ? "Archiving…" : "Archive Thread"}
          </Button>
          {canDelete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={deleteThread}
              disabled={deletingThread}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deletingThread ? "Deleting…" : "Delete Thread"}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col min-h-[400px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 group">
              <div className="flex justify-between items-center gap-3 mb-2">
                <span className="font-medium text-[#1A1A1A] text-sm">{m.sender_name ?? "Unknown"}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#6E6E6E]">{formatDateTime(m.createdAt)}</span>
                  {m.read === true && (
                    <CheckCheck className="w-4 h-4 text-blue-600" aria-label="Read" />
                  )}
                  {m.read === false && (
                    <Check className="w-4 h-4 text-slate-400" aria-label="Sent" />
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteMessage(m.id)}
                      disabled={deletingId === m.id}
                      className="text-red-500 hover:text-red-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Delete message"
                    >
                      {deletingId === m.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
              <div className="text-sm text-[#1A1A1A]">{m.body}</div>
              {m.attachmentUrl && (
                <a
                  href={m.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 text-xs mt-1 block"
                >
                  Attachment
                </a>
              )}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-slate-500 text-center py-8">No messages yet.</div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
