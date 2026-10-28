"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import Button from "../../components/ui/Button";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { updateDeliveryStatus } from "../actions";

interface Delivery {
  id: string;
  reference?: string;
  wholesaler?: string;
  siteId?: string;
  site_id?: string;
  site?: string;
  status?: string;
  scheduledAt?: string;
  scheduled_at?: string;
  createdAt?: string;
  created_at?: string;
  notes?: string;
  podUrl?: string;
  pod_url?: string;
  pod_photos?: string[];
  loadUrl?: string;
  load_url?: string;
  load_photos?: string[];
  proof_photos?: string[];
  delivered_by?: string;
  deliveredByName?: string;
}

export default function DeliveryDetailClient({ deliveryId }: { deliveryId: string }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, { credentials: "include" });
      if (!res.ok) {
        setDelivery(null);
        return;
      }
      const found = (await res.json()) as Delivery;
      setDelivery(found?.id ? found : null);
    } catch {
      setDelivery(null);
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPhotos(type: "load" | "pod", files: File[]) {
    for (const file of files) {
      const body = new FormData();
      body.append("deliveryId", deliveryId);
      body.append("type", type);
      body.append("file", file);
      const res = await fetch("/api/deliveries/upload", { method: "POST", body, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
    }
    await load();
  }

  async function handleStatus(status: string) {
    await updateDeliveryStatus(deliveryId, status);
    setDelivery((d) => (d ? { ...d, status } : null));
  }

  function formatDate(val?: string) {
    return formatDateTime(val ?? null);
  }

  if (loading && !delivery) {
    return <div className="text-slate-500 py-12 text-center">Loading delivery...</div>;
  }

  if (!delivery) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600 mb-4">Delivery not found.</p>
        <Link href="/dashboard/deliveries">
          <Button variant="secondary">Back to Deliveries</Button>
        </Link>
      </div>
    );
  }

  const podPhotos = uniquePhotos(delivery.pod_photos, delivery.podUrl ?? delivery.pod_url);
  const loadPhotos = uniquePhotos(delivery.load_photos ?? delivery.proof_photos, delivery.loadUrl ?? delivery.load_url);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {delivery.reference || delivery.wholesaler || `Delivery ${delivery.id.slice(0, 8)}`}
            </h2>
            <div className="flex gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-sm">
                {delivery.status || "PENDING"}
              </span>
            </div>
          </div>
          <Link href="/dashboard/deliveries">
            <Button variant="secondary" size="sm">Back</Button>
          </Link>
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-slate-500">Site</dt>
            <dd>{delivery.site || delivery.siteId || delivery.site_id || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Supplier</dt>
            <dd>{delivery.wholesaler || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Scheduled</dt>
            <dd>{formatDate(delivery.scheduledAt || delivery.scheduled_at || delivery.createdAt || delivery.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Received by</dt>
            <dd>{delivery.deliveredByName || "—"}</dd>
          </div>
          {delivery.notes && (
            <div className="md:col-span-2">
              <dt className="text-sm text-slate-500">Notes</dt>
              <dd>{delivery.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <PhotoGroup
        title="Load photos"
        hint="Pictures of the goods on the vehicle or as they arrive, before they are signed for."
        empty="No load photos yet."
        photos={loadPhotos}
        onUpload={async (files) => {
          try {
            await uploadPhotos("load", files);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Upload failed");
          }
        }}
      />
      <PhotoGroup
        title="Proof of delivery"
        hint="Signed ticket or photo confirming the delivery was received."
        empty="No POD photos yet."
        photos={podPhotos}
        onUpload={async (files) => {
          try {
            await uploadPhotos("pod", files);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Upload failed");
          }
        }}
      />

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Actions</h3>
        <div className="flex gap-2">
          {delivery.status !== "RECEIVED" && (
            <Button onClick={() => handleStatus("RECEIVED")}>Mark Received</Button>
          )}
          {delivery.status !== "PENDING" && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!window.confirm("Move this received delivery back to pending?")) return;
                void handleStatus("PENDING");
              }}
            >
              Mark Pending
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function uniquePhotos(many: string[] | undefined, single?: string): string[] {
  const list = (Array.isArray(many) ? many : []).filter((url) => typeof url === "string" && url.length > 0);
  if (single && !list.includes(single)) list.unshift(single);
  return [...new Set(list)];
}

function PhotoGroup({
  title,
  hint,
  empty,
  photos,
  onUpload,
}: {
  title: string;
  hint?: string;
  empty: string;
  photos: string[];
  onUpload: (files: File[]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function take(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    if (files.length === 0) return;
    setBusy(true);
    try {
      await onUpload(files);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {busy ? "Uploading…" : "Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void take(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Capture
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void take(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {photos.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
              <Image src={url} alt={title} width={600} height={400} className="rounded-lg h-36 w-full object-cover border" unoptimized />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
