/**
 * Zod schemas for Supabase public tables.
 * Keep in sync with migrations. Run `npm run validate:schema` to check.
 */

import { z } from "zod";

const ts = z.string(); // timestamp/timestamptz as ISO string
const optional = (s: z.ZodTypeAny) => s.optional();

export const companiesSchema = z.object({
  id: z.string(),
  name: z.string(),
  invite_code: optional(z.string()),
  created_at: optional(ts),
  updated_at: optional(ts),
});

export const usersSchema = z.object({
  id: z.string().uuid(),
  /** @deprecated Legacy Firebase migration; no longer used in queries */
  firebase_uid: optional(z.string()),
  company_id: optional(z.string()),
  email: optional(z.string()),
  phone: optional(z.string()),
  display_name: optional(z.string()),
  role: optional(z.string()),
  created_at: optional(ts),
  updated_at: optional(ts),
});

export const sitesSchema = z.object({
  id: z.string(),
  company_id: optional(z.string()),
  name: z.string(),
  address: optional(z.string()),
  location: optional(z.record(z.string(), z.unknown())),
  geofence: optional(z.record(z.string(), z.unknown())),
  latitude: optional(z.number()),
  longitude: optional(z.number()),
  radius_meters: optional(z.number()),
  show_on_map: optional(z.boolean()),
  active: optional(z.boolean()),
  manager_id: optional(z.string()),
  created_at: optional(ts),
  updated_at: optional(ts),
});

export const tasksSchema = z.object({
  id: z.string(),
  company_id: optional(z.string()),
  site_id: optional(z.string()),
  assigned_to: optional(z.string().uuid()),
  title: z.string(),
  description: optional(z.string()),
  status: optional(z.string()),
  created_at: optional(ts),
  updated_at: optional(ts),
});

export const noticesSchema = z.object({
  id: z.string(),
  company_id: optional(z.string()),
  title: z.string(),
  body: optional(z.string()),
  created_at: optional(ts),
});

export const deliveriesSchema = z.object({
  id: z.string(),
  company_id: optional(z.string()),
  site_id: optional(z.string()),
  created_by: optional(z.string().uuid()),
  wholesaler: optional(z.string()),
  reference: optional(z.string()),
  notes: optional(z.string()),
  pod_url: optional(z.string()),
  load_url: optional(z.string()),
  status: optional(z.string()),
  scheduled_at: optional(ts),
  created_at: optional(ts),
});

/** Registry: table name -> Zod schema. Add new tables here. */
export const TABLE_SCHEMAS: Record<string, z.ZodObject<z.ZodRawShape>> = {
  companies: companiesSchema,
  users: usersSchema,
  sites: sitesSchema,
  tasks: tasksSchema,
  notices: noticesSchema,
  deliveries: deliveriesSchema,
};
