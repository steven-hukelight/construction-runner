/**
 * Presentational components for snapshot tests – deterministic rendering with mock data.
 */
import React from "react";
import Link from "next/link";

interface Thread {
  id: string;
  lastMessage: string | null;
  lastAt: string;
}

interface Message {
  id: string;
  sender_name?: string | null;
  body: string;
  createdAt: string;
}

export function MessagingThreadList({ threads, selectedId }: { threads: Thread[]; selectedId?: string }) {
  return (
    <div className="w-full md:w-80 border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold">Inbox</h3>
        <p className="text-sm text-slate-500">{threads.length} thread(s)</p>
      </div>
      <div>
        {threads.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 border-b border-gray-100 ${selectedId === t.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
          >
            <div className="font-medium truncate">{t.lastMessage ?? "No messages"}</div>
            <div className="text-xs text-slate-500">{new Date(t.lastAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MessagingMessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="p-4 space-y-3">
      {messages.map((m) => (
        <div key={m.id} className="border border-gray-200 rounded p-3">
          <div className="text-xs text-slate-500 mb-1">{m.sender_name ?? "Unknown"} • {new Date(m.createdAt).toLocaleString("en-GB")}</div>
          <div>{m.body}</div>
        </div>
      ))}
    </div>
  );
}

export function AssetTableRows({ assets }: { assets: Array<{ id: string; name: string; type?: string; serial_number?: string; status?: string }> }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left p-2">Name</th>
          <th className="text-left p-2">Type</th>
          <th className="text-left p-2">Serial</th>
          <th className="text-left p-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <tr key={a.id} className="border-b border-gray-100">
            <td className="p-2">{a.name}</td>
            <td className="p-2">{a.type ?? "—"}</td>
            <td className="p-2">{a.serial_number ?? "—"}</td>
            <td className="p-2">{a.status ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DeliveryTableRows({
  deliveries,
}: {
  deliveries: Array<{ id: string; reference?: string; site?: string; status?: string; scheduled_at?: string }>;
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left p-2">Reference</th>
          <th className="text-left p-2">Site</th>
          <th className="text-left p-2">Status</th>
          <th className="text-left p-2">Scheduled</th>
        </tr>
      </thead>
      <tbody>
        {deliveries.map((d) => (
          <tr key={d.id} className="border-b border-gray-100">
            <td className="p-2">{d.reference ?? "—"}</td>
            <td className="p-2">{d.site ?? "—"}</td>
            <td className="p-2">{d.status ?? "—"}</td>
            <td className="p-2">
              {d.scheduled_at ? new Date(d.scheduled_at).toLocaleString("en-GB", { dateStyle: "short" }) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TaskTableRows({
  tasks,
}: {
  tasks: Array<{ id: string; title: string; status?: string; description?: string }>;
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left p-2">Title</th>
          <th className="text-left p-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id} className="border-b border-gray-100">
            <td className="p-2">{t.title}</td>
            <td className="p-2">{t.status ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PreInductionAdminView({ sections }: { sections: Array<{ section: string; status: string }> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pre-Induction</h2>
      <div className="grid gap-2">
        {sections.map((s) => (
          <div key={s.section} className="border border-gray-200 rounded p-4 flex justify-between items-center">
            <span className="font-medium capitalize">{s.section.replace(/([A-Z])/g, " $1").trim()}</span>
            <span className="text-sm text-slate-500">{s.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RAMSList({ rams }: { rams: Array<{ id: string; title: string; status?: string; version?: string }> }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left p-2">Title</th>
          <th className="text-left p-2">Status</th>
          <th className="text-left p-2">Version</th>
        </tr>
      </thead>
      <tbody>
        {rams.map((r) => (
          <tr key={r.id} className="border-b border-gray-100">
            <td className="p-2">
              <Link href={`/dashboard/health-and-safety/rams/${r.id}`} className="text-blue-600 hover:underline">
                {r.title || "Untitled"}
              </Link>
            </td>
            <td className="p-2">{r.status ?? "—"}</td>
            <td className="p-2">{r.version ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
