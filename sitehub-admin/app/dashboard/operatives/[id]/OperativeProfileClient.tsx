"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

type User = {
  id: string;
  avatar?: string;
  name?: string;
  email?: string;
  role?: string;
  companyId?: string;
  companyName?: string;
  addressLine1?: string;
  town?: string;
  postcode?: string;
  jobTitle?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nationalInsurance?: string;
  utr?: string;
  dateOfBirth?: string;
};
type MedicalRecord = { id: string; title?: string; notes?: string; file_url?: string; fileUrl?: string; file_name?: string; fileName?: string; created_at?: string };

export default function OperativeProfileClient({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [medical, setMedical] = useState<MedicalRecord[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMedical() {
    try {
      const res = await fetch(`/api/users/${id}/medical`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMedical(Array.isArray(data) ? data : []);
      }
    } catch {
      setMedical([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const res = await fetch(`/api/users/${id}`, { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = await res.json();
        const u = data as Record<string, unknown>;
        const displayName = (u.name ?? u.display_name ?? u.email ?? "—") as string;
        if (!cancelled) {
          setUser({
            id: data.id,
            avatar: u.avatar as string | undefined,
            name: displayName,
            email: (u.email as string) ?? "",
            role: (u.role as string) ?? "—",
            companyId: u.companyId as string | undefined,
            companyName: u.companyName as string | undefined,
            addressLine1: u.addressLine1 as string | undefined,
            town: u.town as string | undefined,
            postcode: u.postcode as string | undefined,
            jobTitle: u.jobTitle as string | undefined,
            emergencyContactName: u.emergencyContactName as string | undefined,
            emergencyContactPhone: u.emergencyContactPhone as string | undefined,
            nationalInsurance: u.nationalInsurance as string | undefined,
            utr: u.utr as string | undefined,
            dateOfBirth: u.dateOfBirth as string | undefined,
          });
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${id}/medical`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setMedical(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMedical([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function upload() {
    if (!file) return alert("Select a file");
    setLoading(true);
    try {
      // Read file as base64 and send to server for validation and storage
      const toBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const idx = result.indexOf(",");
            resolve(result.slice(idx + 1));
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(f);
        });

      const base = await toBase64(file);

      const res = await fetch("/api/uploads/medical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operativeId: id,
          title,
          notes,
          fileName: file.name,
          contentType: file.type,
          fileBase64: base,
        }),
      });

      if (!res.ok) throw new Error("upload failed");
      await res.json();

      setTitle("");
      setNotes("");
      setFile(null);
      setMedical([]);
      await loadMedical();
      alert("Uploaded");
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-900">Operative Profile</h2>
        {!user && <p className="text-sm text-slate-500">Loading...</p>}
        {user && (
          <div className="mt-3 flex items-center gap-4">
            {user.avatar && (
              <Image
                src={user.avatar}
                alt={user.name ?? "Avatar"}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                unoptimized
              />
            )}
            <div className="space-y-1">
              <div className="font-medium text-slate-900">{user.name}</div>
              <div className="text-sm text-slate-600">{user.email}</div>
              <div className="text-sm text-slate-700">Role: {user.role}</div>
              {(user.companyName || user.companyId) && (
                <div className="text-sm text-slate-500">Company: {user.companyName ?? user.companyId}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {user && (user.addressLine1 || user.town || user.postcode || user.emergencyContactName || user.jobTitle || user.nationalInsurance) && (
        <div className="card">
          <h3 className="font-medium text-slate-900">Personal Info</h3>
          <p className="text-xs text-slate-500 mt-1">Synced from mobile app</p>
          <div className="mt-3 space-y-2 text-sm">
            {(user.addressLine1 || user.town || user.postcode) && (
              <div>
                <span className="font-medium text-slate-600">Address: </span>
                {[user.addressLine1, user.town, user.postcode].filter(Boolean).join(", ")}
              </div>
            )}
            {user.jobTitle && (
              <div>
                <span className="font-medium text-slate-600">Job title: </span>
                {user.jobTitle}
              </div>
            )}
            {(user.emergencyContactName || user.emergencyContactPhone) && (
              <div>
                <span className="font-medium text-slate-600">Emergency contact: </span>
                {[user.emergencyContactName, user.emergencyContactPhone].filter(Boolean).join(" – ")}
              </div>
            )}
            {user.nationalInsurance && (
              <div>
                <span className="font-medium text-slate-600">NI number: </span>
                {user.nationalInsurance}
              </div>
            )}
            {user.utr && (
              <div>
                <span className="font-medium text-slate-600">UTR: </span>
                {user.utr}
              </div>
            )}
            {user.dateOfBirth && (
              <div>
                <span className="font-medium text-slate-600">DOB: </span>
                {new Date(user.dateOfBirth).toLocaleDateString("en-GB")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-medium text-slate-900">Medical History</h3>

        <div className="space-y-2 mt-3">
          {medical.map((m) => (
            <div key={m.id} className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <div className="font-medium text-slate-900">{m.title}</div>
              <div className="text-sm text-slate-600">{m.notes}</div>
              <div className="text-sm">
                <a
                  href={(m as MedicalRecord).fileUrl ?? (m as MedicalRecord).file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                >
                  {(m as MedicalRecord).fileName ?? (m as MedicalRecord).file_name ?? "File"}
                </a>
              </div>
            </div>
          ))}

          {medical.length === 0 && <div className="text-sm text-slate-500">No records.</div>}
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-medium text-slate-900">Upload Medical Record</h3>
        <Input label="Title" value={title} onChange={(e: { target: { value: string } }) => setTitle(e.target.value)} />
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="w-full input min-h-[80px]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div className="mt-2">
          <Button onClick={upload} disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
