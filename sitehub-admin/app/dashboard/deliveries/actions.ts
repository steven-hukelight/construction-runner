"use server";

import { callRoute, callRouteList } from "@/lib/server/callRoute";
import { GET as getDeliveries, POST as postDelivery } from "@/app/api/deliveries/route";
import { DELETE as deleteDeliveryRoute, PATCH as patchDelivery } from "@/app/api/deliveries/[id]/route";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchDeliveries() {
  return callRouteList(getDeliveries, "/api/deliveries");
}

export async function createDelivery(data: any) {
  await callRoute(postDelivery, "/api/deliveries", { method: "POST", body: data });
}

export async function updateDeliveryStatus(id: string, status: string) {
  await callRoute(patchDelivery, `/api/deliveries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { status },
    params: { id },
  });
}

export async function deleteDelivery(id: string) {
  await callRoute(deleteDeliveryRoute, `/api/deliveries/${encodeURIComponent(id)}`, { method: "DELETE", params: { id } });
}
