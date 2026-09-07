"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import PageHeader from "@/app/dashboard/components/PageHeader";
import Table from "@/app/dashboard/components/ui/Table";
import { Database } from "lucide-react";

type MaybeDate =
  | string
  | number
  | Date
  | { toDate?: () => Date; seconds?: number; _seconds?: number }
  | null
  | undefined;

type AttachmentLike = { url?: string; downloadUrl?: string; downloadURL?: string; href?: string };

type Item = {
  id: string;
  title?: string;
  issuer?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  mimeType?: string;
  contentType?: string;
  issueDate?: MaybeDate;
  expiryDate?: MaybeDate;
  createdAt?: MaybeDate;
  userId?: string | null;
  parentCollection?: string | null;
  parentId?: string | null;
  path?: string;
  attachment?: { url?: string; type?: string } | string | null;
  fileUrl?: string;
  url?: string;
  photoUrl?: string;
  imageUrl?: string;
  file?: { url?: string } | null;
  files?: AttachmentLike[];
  attachments?: AttachmentLike[];
} & Record<string, unknown>;

type UserSummary = { id?: string; name?: string; email?: string; displayName?: string };
type ProfileSummary = { id?: string; userId?: string; displayName?: string };

export default function CertificationsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"certifications" | "training">("certifications");
  const [certs, setCerts] = useState<Item[]>([]);
  const [training, setTraining] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [mine, setMine] = useState(false);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);

  // Load certs/training via API
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/certifications").then((r) => r.ok ? r.json() : []),
      fetch("/api/training").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/users").then((r) => r.ok ? r.json() : []),
      fetch("/api/profiles").then((r) => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([certsData, trainingData, usersData, profilesData]) => {
        setCerts(Array.isArray(certsData) ? certsData : []);
        setTraining(Array.isArray(trainingData) ? trainingData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setProfiles(Array.isArray(profilesData) ? profilesData : []);
      })
      .finally(() => setLoading(false));
  }, []);


  const sessionUser = session?.user as { id?: string; uid?: string } | undefined;
  const sessionUid = sessionUser?.id ?? sessionUser?.uid ?? "";

  const items = tab === "certifications" ? certs : training;
  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let base = items;
    const uid = mine && sessionUid ? sessionUid : userFilter.trim();
    if (uid) {
      const uf = uid;
      base = base.filter((it) => (it.userId || "") === uf);
    }
    if (!q) return base;
    return base.filter((it) => {
      const hay = [it.title, it.issuer, it.userId, it.parentId]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return hay.some((h) => h.includes(q));
    });
  }, [items, filter, userFilter, mine, sessionUid]);

  const userMap = useMemo(() => {
    const m = new Map<string, UserSummary>();
    users.forEach((u) => {
      if (u.id) m.set(String(u.id), u);
    });
    return m;
  }, [users]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, ProfileSummary>();
    profiles.forEach((p) => {
      const uid = p.id ?? p.userId;
      if (uid) m.set(String(uid), p);
    });
    return m;
  }, [profiles]);

  const resolveUserName = useCallback((it: Item): string => {
    const uid = String(it.userId || it.parentId || "").trim();
    if (!uid) return "—";
    const p = profileByUserId.get(uid);
    if (p?.displayName && String(p.displayName).trim()) return String(p.displayName);
    const u = userMap.get(uid);
    if (u?.name && String(u.name).trim()) return String(u.name);
    if (u?.email && String(u.email).includes("@")) return String(u.email).split("@")[0];
    return uid || "—";
  }, [profileByUserId, userMap]);

  const deleteItem = useCallback(async (row: Item) => {
    try {
      const endpoint = tab === "certifications" ? "/api/certifications" : "/api/training";
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: row.path || "",
          parentCollection: row.parentCollection,
          parentId: row.parentId,
          id: row.id,
        }),
      });
      const json = await res.json();
      if (json && json.success) {
        if (tab === "certifications") {
          setCerts((prev) => prev.filter((i) => i.id !== row.id || i.parentId !== row.parentId));
        } else {
          setTraining((prev) => prev.filter((i) => i.id !== row.id || i.parentId !== row.parentId));
        }
      }
    } catch {}
  }, [tab]);

  async function editItem(row: Item) {
    const currentTitle = row.title || "";
    const currentIssuer = row.issuer || "";
    const currentIssue = toDateString(resolveIssueDate(row)) || "";
    const currentExpiry = toDateString(resolveExpiryDate(row)) || "";

    const title = window.prompt("Title", currentTitle);
    if (title === null) return; // cancelled
    const issuer = window.prompt("Issuer", currentIssuer);
    if (issuer === null) return;
    const issueDate = window.prompt("Issue Date (DD/MM/YYYY)", currentIssue);
    if (issueDate === null) return;
    const expiryDate = window.prompt("Expiry Date (DD/MM/YYYY)", currentExpiry);
    if (expiryDate === null) return;

    try {
      const endpoint = tab === "certifications" ? "/api/certifications" : "/api/training";
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: row.path || "",
          parentCollection: row.parentCollection,
          parentId: row.parentId,
          id: row.id,
          title,
          issuer,
          issueDate,
          expiryDate,
        }),
      });
      const json = await res.json();
      if (json && json.success) {
        const applyUpdate = (list: Item[]) =>
          list.map((i) =>
            i.id === row.id && i.parentId === row.parentId
              ? { ...i, title, issuer, issueDate, expiryDate }
              : i
          );
        if (tab === "certifications") {
          setCerts((prev) => applyUpdate(prev));
        } else {
          setTraining((prev) => applyUpdate(prev));
        }
      }
    } catch {}
  }

  async function changeDoc(row: Item) {
    try {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*,application/pdf";
      const picked = await new Promise<File | null>((resolve) => {
        fileInput.onchange = () => {
          const f = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
          resolve(f);
        };
        fileInput.click();
      });

      if (!picked) {
        const url = window.prompt("Paste new document URL");
        if (!url) return;
        await patchAttachment(row, url, guessTypeFromUrl(url));
        return;
      }

      const { supabase } = await import("@/supabase/auth/client");
      const kind = tab === "certifications" ? "certifications" : "training";
      const owner = row.parentId || row.userId || "unknown";
      const path = `uploads/${kind}/${owner}/${row.id}-${picked.name}`;
      const { data, error } = await supabase.storage.from("uploads").upload(path, picked, { upsert: true, contentType: picked.type || undefined });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(data?.path || path);
      await patchAttachment(row, urlData.publicUrl, picked.type || guessTypeFromUrl(urlData.publicUrl));
    } catch {}
  }

  async function patchAttachment(row: Item, url: string, type?: string) {
    const endpoint = tab === "certifications" ? "/api/certifications" : "/api/training";
    try {
      await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: row.path || "",
          parentCollection: row.parentCollection,
          parentId: row.parentId,
          id: row.id,
          attachmentUrl: url,
          mimeType: type || undefined,
        }),
      });
    } catch {}
  }

  function guessTypeFromUrl(url: string | null): string | undefined {
    if (!url) return undefined;
    const dm = url.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-]+);base64,/);
    if (dm && dm[1]) return dm[1].toLowerCase();
    const m = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (m && m[1]) {
      const ext = m[1].toLowerCase();
      if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
      if (ext === "png") return "image/png";
      if (ext === "gif") return "image/gif";
      if (ext === "webp") return "image/webp";
      if (ext === "bmp") return "image/bmp";
      if (ext === "pdf") return "application/pdf";
    }
    return undefined;
  }

  return (
    <>
      <PageHeader title="Certifications & Training" description="View records uploaded from mobile and web (live)" />

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setTab("certifications")}
          className={`button ${tab === "certifications" ? "" : "ghost"}`}
        >
          Certifications
        </button>
        <button
          onClick={() => setTab("training")}
          className={`button ${tab === "training" ? "" : "ghost"}`}
        >
          Training
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setMine((m) => !m)}
          className={`button ${mine ? "" : "ghost"} mr-2`}
          title="Only show my records"
        >
          Mine
        </button>
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="input w-40 mr-2"
          placeholder="User ID"
          aria-label="Filter by userId"
        />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-64"
          placeholder="Search title, issuer, user ID"
          aria-label="Search"
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{tab === "certifications" ? "Certifications" : "Training"}</h3>
            <p className="text-sm text-slate-600">{filteredItems.length} record{filteredItems.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No records yet</div>
        ) : (
          <Table
            columns={[
              { header: "Title", accessor: "title" },
              { header: "Issuer", accessor: "issuer" },
              {
                header: "User",
                accessor: "userId",
                render: (row: Item) => resolveUserName(row),
              },
              {
                header: "Issue",
                render: (row: Item) => toDateString(resolveIssueDate(row)),
              },
              {
                header: "Expiry",
                render: (row: Item) => toDateString(resolveExpiryDate(row)),
              },
              {
                header: "Attachment",
                render: (row: Item) => {
                  const url = getAttachmentUrl(row);
                  let type = getAttachmentMime(row);

                  if (!type && typeof url === "string") {
                    const dataMatch = url.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-]+);base64,/);
                    if (dataMatch?.[1]) {
                      type = dataMatch[1].toLowerCase();
                    } else {
                      const m = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
                      if (m?.[1]) type = m[1].toLowerCase();
                    }
                  }

                  const isImage =
                    !!type && (type.startsWith("image/") || type === "image" || ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(type));

                  if (!url) return "—";
                  if (isImage) {
                    return (
                      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                        <Image
                          src={url}
                          alt={row.title || "Attachment"}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded object-cover border border-gray-200"
                          unoptimized
                        />
                        <span className="text-blue-600 hover:underline">Open</span>
                      </a>
                    );
                  }
                  return (
                    <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      Open
                    </a>
                  );
                },
              },
              {
                header: "Actions",
                render: (row: Item) => (
                  <div className="flex gap-2">
                    <button className="button ghost" onClick={() => editItem(row)}>Edit</button>
                    <button className="button ghost" onClick={() => changeDoc(row)}>Change Doc</button>
                    <button className="button" onClick={() => deleteItem(row)}>Delete</button>
                  </div>
                ),
              },
            ]}
            data={filteredItems}
          />
        )}
      </div>
    </>
  );
}

function toDateString(val: MaybeDate): string {
  if (!val) return "—";
  try {
    // Object with toDate() (e.g. some client SDKs)
    if (typeof (val as { toDate?: () => Date }).toDate === "function") {
      return formatUk((val as { toDate: () => Date }).toDate());
    }
    // Seconds-based timestamp object { seconds } or { _seconds }
    if (typeof (val as { seconds?: number }).seconds === "number") {
      return formatUk(new Date((val as { seconds: number }).seconds * 1000));
    }
    if (typeof (val as { _seconds?: number })._seconds === "number") {
      return formatUk(new Date((val as { _seconds: number })._seconds * 1000));
    }
    // Already a Date
    if (val instanceof Date) return formatUk(val);
    // String or number
    if (typeof val === "string") return formatUk(new Date(val));
    if (typeof val === "number") return formatUk(new Date(val));
    return "—";
  } catch {
    return "—";
  }
}

function formatUk(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Robust date resolution for varying field names
function resolveIssueDate(it: Item): MaybeDate {
  return (
    it.issueDate ??
    it["issuedAt"] ??
    it["issue"] ??
    it["startDate"] ??
    it["dateIssued"] ??
    it["date"] ??
    it["trainingDate"] ??
    it["completedOn"] ??
    it["completedDate"] ??
    null
  );
}

function resolveExpiryDate(it: Item): MaybeDate {
  return (
    it.expiryDate ??
    it["expiry"] ??
    it["expires"] ??
    it["expiration"] ??
    it["expirationDate"] ??
    it["validUntil"] ??
    null
  );
}

function getAttachmentUrl(row: Item): string | null {
  const url =
    row.attachmentUrl ??
    (typeof row.attachment === "string" ? row.attachment : row.attachment?.url) ??
    row.fileUrl ??
    row.url ??
    row.photoUrl ??
    row.imageUrl ??
    row.file?.url ??
    row.files?.[0]?.url ??
    row.attachments?.[0]?.url ??
    row.attachments?.[0]?.downloadUrl ??
    row.attachments?.[0]?.downloadURL ??
    row.attachments?.[0]?.href ??
    null;
  return url ?? null;
}

function getAttachmentMime(row: Item): string {
  const type =
    row.attachmentType ??
    (typeof row.attachment !== "string" ? row.attachment?.type : undefined) ??
    row.mimeType ??
    row.contentType ??
    "";
  return type ? String(type).toLowerCase() : "";
}
