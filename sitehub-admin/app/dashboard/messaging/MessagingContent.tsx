"use client";
import toast from "react-hot-toast";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { Check, CheckCheck } from "lucide-react";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";

interface Thread {
  id: string;
  createdBy: string;
  createdAt: string;
  title?: string | null;
  kind?: "site" | "direct";
  siteName?: string | null;
  lastMessage: string | null;
  lastAt: string;
  inThread: boolean;
  unread?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  sender_name?: string | null;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  read?: boolean;
}

interface CompanyUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface CompanySite {
  id: string;
  name?: string | null;
}

export default function MessagingContent({ companyId, canDelete = false }: { companyId: string; canDelete?: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<{ id: string; messages: Message[] } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingThread, setDeletingThread] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeBody, setComposeBody] = useState("");
  const [composeMode, setComposeMode] = useState<"site" | "pick">("pick");
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [companySites, setCompanySites] = useState<CompanySite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [loadingComposeUsers, setLoadingComposeUsers] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);

  const [threadLoading, setThreadLoading] = useState(false);
  const threadsInFlight = useRef(false);
  const threadInFlight = useRef(false);

  const fetchThreads = useCallback(async (options?: { background?: boolean }) => {
    if (threadsInFlight.current) return;
    if (options?.background && document.hidden) return;
    threadsInFlight.current = true;
    try {
      const res = await fetch(`/api/messages/threads?companyId=${encodeURIComponent(companyId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch {
      if (!options?.background) setThreads([]);
    } finally {
      threadsInFlight.current = false;
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (!composeOpen || !companyId) return;
    let cancelled = false;
    void (async () => {
      setLoadingComposeUsers(true);
      try {
        const [meRes, usersRes, sitesRes] = await Promise.all([
          fetch("/api/me", { credentials: "include", cache: "no-store" }),
          fetch(`/api/users?companyId=${encodeURIComponent(companyId)}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/sites?companyId=${encodeURIComponent(companyId)}`, { credentials: "include", cache: "no-store" }),
        ]);
        const me = await meRes.json().catch(() => ({}));
        const usersJson = await usersRes.json().catch(() => []);
        const sitesJson = await sitesRes.json().catch(() => []);
        if (cancelled) return;
        setMyUserId(typeof me?.id === "string" ? me.id : null);
        setCompanyUsers(Array.isArray(usersJson) ? usersJson : []);
        setCompanySites(Array.isArray(sitesJson) ? sitesJson : []);
        setSelectedRecipientIds([]);
        setSelectedSiteId("");
      } finally {
        if (!cancelled) setLoadingComposeUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [composeOpen, companyId]);

  const selectedThreadIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedThreadIdRef.current = selectedThread?.id ?? null;
  }, [selectedThread?.id]);

  const refreshSelectedThread = useCallback(async () => {
    const id = selectedThreadIdRef.current;
    if (!id || threadInFlight.current || document.hidden) return;
    threadInFlight.current = true;
    try {
      const res = await fetch(`/api/messages/thread/${id}?companyId=${encodeURIComponent(companyId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data?.messages) {
        setSelectedThread((prev) => (prev && prev.id === id ? { ...prev, messages: data.messages } : prev));
      }
    } catch (e) {
      console.error(e);
    } finally {
      threadInFlight.current = false;
    }
  }, [companyId]);

  const MESSAGE_REFRESH_SEC = 3;
  useEffect(() => {
    const id = setInterval(() => void fetchThreads({ background: true }), MESSAGE_REFRESH_SEC * 1000);
    return () => clearInterval(id);
  }, [fetchThreads]);

  useEffect(() => {
    if (!selectedThread?.id) return;
    const id = setInterval(refreshSelectedThread, MESSAGE_REFRESH_SEC * 1000);
    return () => clearInterval(id);
  }, [selectedThread?.id, refreshSelectedThread]);

  async function openThread(id: string) {
    selectedThreadIdRef.current = id;
    setSelectedThread({ id, messages: [] });
    setThreadLoading(true);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
    try {
      const res = await fetch(`/api/messages/thread/${id}?companyId=${encodeURIComponent(companyId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (selectedThreadIdRef.current !== id) return;
      if (data?.messages) {
        setSelectedThread({ id, messages: data.messages });
      } else {
        toast.error(data?.error ?? "Could not load this conversation");
      }
    } catch (e) {
      console.error(e);
      if (selectedThreadIdRef.current === id) toast.error("Could not load this conversation");
    } finally {
      if (selectedThreadIdRef.current === id) setThreadLoading(false);
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
        toast.error(j?.error ?? "Failed to delete message");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete message");
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
        toast.error(j?.error ?? "Failed to delete thread");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete thread");
    } finally {
      setDeletingThread(false);
    }
  }

  async function archiveThread(threadId?: string) {
    const id = threadId ?? selectedThread?.id;
    if (!id) return;
    setArchiving(id === selectedThread?.id);
    setArchivingId(id);
    try {
      const res = await fetch(`/api/messages/thread/${id}/archive`, { method: "POST", credentials: "include" });
      if (res.ok) {
        if (selectedThread?.id === id) setSelectedThread(null);
        fetchThreads();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to archive");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to archive thread");
    } finally {
      setArchiving(false);
      setArchivingId(null);
    }
  }

  async function deleteThreadFromList(threadId: string) {
    if (!canDelete) return;
    if (!confirm("Delete this entire thread? This cannot be undone.")) return;
    setDeletingThreadId(threadId);
    try {
      const res = await fetch(
        `/api/messages/thread/${threadId}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        if (selectedThread?.id === threadId) setSelectedThread(null);
        fetchThreads();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error ?? "Failed to delete thread");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete thread");
    } finally {
      setDeletingThreadId(null);
    }
  }

  async function submitNewThread() {
    if (!myUserId) {
      toast.error("Could not resolve your account. Refresh the page and try again.");
      return;
    }
    const opening = composeBody.trim();
    if (composeMode === "site") {
      if (!selectedSiteId) {
        toast.error("Pick a site for this channel.");
        return;
      }
      setSending(true);
      try {
        const res = await fetch("/api/messages/threads", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "site",
            site_id: selectedSiteId,
            ...(opening ? { body: opening } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof data?.error === "string" ? data.error : "Failed to create conversation");
          return;
        }
        if (data?.id) {
          setComposeOpen(false);
          setComposeBody("");
          setSelectedRecipientIds([]);
          setComposeMode("pick");
          await fetchThreads();
          await openThread(data.id as string);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to create conversation");
      } finally {
        setSending(false);
      }
      return;
    }
    const recipientIds = selectedRecipientIds.filter((id) => id !== myUserId);
    if (recipientIds.length === 0) {
      toast.error("Select at least one recipient.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "direct",
          recipientIds,
          ...(opening ? { body: opening } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to create conversation");
        return;
      }
      if (data?.id) {
        setComposeOpen(false);
        setComposeBody("");
        setSelectedRecipientIds([]);
        setComposeMode("pick");
        await fetchThreads();
        await openThread(data.id as string);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create conversation");
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: selectedThread.id, body: newMessage.trim() }),
      });
      setNewMessage("");
      const res = await fetch(`/api/messages/thread/${selectedThread.id}?companyId=${encodeURIComponent(companyId)}`, {
        credentials: "include",
      });
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

  function toggleRecipient(id: string) {
    setSelectedRecipientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (loading && threads.length === 0) {
    return (
      <div className="card overflow-hidden" aria-busy="true" aria-label="Loading conversations">
        <div className="flex flex-col md:flex-row min-h-[400px]">
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 space-y-2">
              <Skeleton className="h-4 w-16 rounded bg-gray-200" />
              <Skeleton className="h-3 w-20 rounded bg-gray-100" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-100 space-y-2">
                <Skeleton className="h-4 w-40 rounded bg-gray-200" />
                <Skeleton className="h-3 w-52 rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden relative">
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-thread-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setComposeOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 id="compose-thread-title" className="text-lg font-semibold text-gray-900">
                New conversation
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Site chat is for everyone on that job. Private is only the people you pick.
              </p>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Recipients</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="composeMode"
                      checked={composeMode === "pick"}
                      onChange={() => setComposeMode("pick")}
                    />
                    Private — only the people you pick
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="composeMode"
                      checked={composeMode === "site"}
                      onChange={() => setComposeMode("site")}
                    />
                    Site chat — everyone on that site
                  </label>
                </div>
              </div>
              {composeMode === "site" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                  {loadingComposeUsers ? (
                    <div className="p-3 text-sm text-slate-500">Loading sites…</div>
                  ) : companySites.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No sites found.</div>
                  ) : (
                    <select
                      className="input w-full"
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                    >
                      <option value="">Choose a site</option>
                      {companySites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {composeMode === "pick" && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {loadingComposeUsers ? (
                    <div className="p-3 text-sm text-slate-500">Loading users…</div>
                  ) : companyUsers.filter((u) => u.id !== myUserId).length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No users found.</div>
                  ) : (
                    companyUsers
                      .filter((u) => u.id !== myUserId)
                      .map((u) => {
                        const label =
                          [u.name, u.email].filter(Boolean).join(" · ") || u.id.slice(0, 8);
                        return (
                          <label
                            key={u.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRecipientIds.includes(u.id)}
                              onChange={() => toggleRecipient(u.id)}
                            />
                            <span className="truncate">{label}</span>
                            {u.role && <span className="text-xs text-slate-400 shrink-0">({u.role})</span>}
                          </label>
                        );
                      })
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First message (optional)</label>
                <textarea
                  className="input w-full min-h-[88px]"
                  placeholder="Type an opening message…"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  disabled={sending}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setComposeOpen(false)} disabled={sending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitNewThread()} disabled={sending || loadingComposeUsers}>
                {sending ? "Starting…" : "Start conversation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row min-h-[400px]">
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Inbox</h3>
              <p className="text-sm text-slate-500">{threads.length} thread(s)</p>
            </div>
            <Button size="sm" onClick={() => setComposeOpen(true)} disabled={sending}>
              New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group/row flex items-center gap-2 border-b border-gray-100 hover:bg-gray-50 ${
                  selectedThread?.id === t.id ? "bg-blue-50" : ""
                }`}
              >
                <button
                  onClick={() => openThread(t.id)}
                  className="flex-1 min-w-0 text-left px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`font-medium truncate ${t.unread ? "font-semibold" : ""}`}>
                      {t.kind === "site" ? t.siteName || t.title || "Site chat" : t.title || t.lastMessage || "Conversation"}
                    </div>
                    {t.unread ? <span className="shrink-0 w-2 h-2 rounded-full bg-blue-600" /> : null}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {t.kind === "site" ? "Site chat · " : t.kind === "direct" ? "Private · " : ""}
                    {t.lastMessage || "No messages"}
                    {t.lastAt ? ` · ${formatDateTime(t.lastAt)}` : ""}
                  </div>
                </button>
                <div className="flex items-center gap-1 pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); archiveThread(t.id); }}
                    disabled={archivingId === t.id}
                    className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded"
                    title="Archive"
                  >
                    {archivingId === t.id ? "…" : "Archive"}
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteThreadFromList(t.id); }}
                      disabled={deletingThreadId === t.id}
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      {deletingThreadId === t.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
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
                  <Button variant="secondary" size="sm" onClick={() => archiveThread()} disabled={archiving}>
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
                {threadLoading && selectedThread.messages.length === 0 && (
                  <div className="space-y-4" aria-busy="true" aria-label="Loading messages">
                    {[0, 1].map((i) => (
                      <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3.5 space-y-2">
                        <Skeleton className="h-4 w-32 rounded bg-gray-200" />
                        <Skeleton className="h-3 w-3/4 rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                )}
                {!threadLoading && selectedThread.messages.length === 0 && (
                  <p className="text-sm text-gray-500">No messages yet. Write the first one below.</p>
                )}
                {selectedThread.messages.map((m) => (
                  <div key={m.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 group">
                    <div className="flex justify-between items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900 text-sm">{m.sender_name ?? "Unknown"}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">{formatDateTime(m.createdAt)}</span>
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
                    <div className="text-sm text-gray-900">{m.body}</div>
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
