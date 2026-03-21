"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "../components/ui/Button";

interface Thread {
  id: string;
  createdBy: string;
  createdAt: string;
  lastMessage: string | null;
  lastAt: string;
  inThread: boolean;
}

interface Message {
  id: string;
  senderId: string;
  sender_name?: string | null;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
}

export default function MessagingContent({ companyId, canDelete = false }: { companyId: string; canDelete?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<{ id: string; messages: Message[] } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/threads?companyId=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  async function openThread(id: string) {
    try {
      const res = await fetch(`/api/messages/thread/${id}?companyId=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      if (data?.messages) {
        setSelectedThread({ id, messages: data.messages });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteMessage(messageId: string) {
    if (!selectedThread || !canDelete) return;
    setDeletingId(messageId);
    try {
      const res = await fetch(
        `/api/messages/thread/${selectedThread.id}/message/${messageId}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setSelectedThread({
          ...selectedThread,
          messages: selectedThread.messages.filter((m) => m.id !== messageId),
        });
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
    if (!selectedThread || !canDelete) return;
    if (!confirm("Delete this entire thread? This cannot be undone.")) return;
    setDeletingThread(true);
    try {
      const res = await fetch(
        `/api/messages/thread/${selectedThread.id}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setSelectedThread(null);
        fetchThreads();
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
    if (!selectedThread) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/messages/thread/${selectedThread.id}/archive`, { method: "POST", credentials: "include" });
      if (res.ok) {
        setSelectedThread(null);
        fetchThreads();
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

  async function createThread(recipientIds: string[] = []) {
    setSending(true);
    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds, body: newMessage || "Started conversation" }),
      });
      const data = await res.json();
      if (data?.id) {
        setNewMessage("");
        await fetchThreads();
        openThread(data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function sendMessage() {
    if (!selectedThread || !newMessage.trim()) return;
    setSending(true);
    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: selectedThread.id, body: newMessage.trim() }),
      });
      setNewMessage("");
      const res = await fetch(`/api/messages/thread/${selectedThread.id}?companyId=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      if (data?.messages) {
        setSelectedThread({ ...selectedThread, messages: data.messages });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  if (loading && threads.length === 0) {
    return <div className="text-slate-500 py-12 text-center">Loading threads...</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col md:flex-row min-h-[400px]">
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Inbox</h3>
              <p className="text-sm text-slate-500">{threads.length} thread(s)</p>
            </div>
            <Button size="sm" onClick={() => createThread()} disabled={sending}>
              New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedThread?.id === t.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                }`}
              >
                <div className="font-medium truncate">{t.lastMessage ?? "No messages"}</div>
                <div className="text-xs text-slate-500">{new Date(t.lastAt).toLocaleString()}</div>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="p-4 text-slate-500 text-sm">No threads yet. Start a new conversation.</div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                <Link href={`/dashboard/messages/${selectedThread.id}`} className="text-blue-600 hover:underline text-sm">
                  Open in new page →
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
              <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64">
                {selectedThread.messages.map((m) => (
                  <div key={m.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 group">
                    <div className="flex justify-between items-center gap-3 mb-2">
                      <span className="font-medium text-[#1A1A1A] text-sm">{m.sender_name ?? "Unknown"}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#6E6E6E]">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs mt-1 block">
                        Attachment
                      </a>
                    )}
                  </div>
                ))}
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Select a thread or start a new conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
