"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Button from "../../components/ui/Button";
import { updateDeliveryStatus } from "../actions";

interface Delivery {
  id: string;
  reference?: string;
  wholesaler?: string;
  siteId?: string;
  site?: string;
  status?: string;
  scheduledAt?: string;
  createdAt?: string;
  notes?: string;
  podUrl?: string;
  loadUrl?: string;
  proof_photos?: string[];
  delivered_by?: string;
}

export default function DeliveryDetailClient({ deliveryId }: { deliveryId: string }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/deliveries", { credentials: "include" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const found = list.find((d: Delivery) => d.id === deliveryId);
      setDelivery(found ?? null);
    } catch {
      setDelivery(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [deliveryId]);

  async function handleStatus(status: string) {
    await updateDeliveryStatus(deliveryId, status);
    setDelivery((d) => (d ? { ...d, status } : null));
  }

  function formatDate(val?: string) {
    if (!val) return "—";
    return new Date(val).toLocaleString();
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

  const photos = delivery.proof_photos ?? [];
  const podUrl = delivery.podUrl ?? photos[0];
  const loadUrl = delivery.loadUrl ?? photos[1];

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
            <dd>{delivery.site || delivery.siteId || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Scheduled</dt>
            <dd>{formatDate(delivery.scheduledAt || delivery.createdAt)}</dd>
          </div>
          {delivery.notes && (
            <div className="md:col-span-2">
              <dt className="text-sm text-slate-500">Notes</dt>
              <dd>{delivery.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Proof of Delivery</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {podUrl && (
            <div>
              <p className="text-sm text-slate-500 mb-2">POD</p>
              <a href={podUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img src={podUrl} alt="POD" className="rounded-lg max-h-48 object-cover border" />
              </a>
            </div>
          )}
          {loadUrl && (
            <div>
              <p className="text-sm text-slate-500 mb-2">Load Photo</p>
              <a href={loadUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img src={loadUrl} alt="Load" className="rounded-lg max-h-48 object-cover border" />
              </a>
            </div>
          )}
          {!podUrl && !loadUrl && photos.length === 0 && (
            <p className="text-slate-500">No photos uploaded.</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Actions</h3>
        <div className="flex gap-2">
          {delivery.status !== "RECEIVED" && (
            <Button onClick={() => handleStatus("RECEIVED")}>Mark Received</Button>
          )}
          {delivery.status !== "PENDING" && (
            <Button variant="secondary" onClick={() => handleStatus("PENDING")}>Mark Pending</Button>
          )}
        </div>
      </div>
    </div>
  );
}
