#!/usr/bin/env npx ts-node
/**
 * Import Firebase export JSON files into firebase_staging tables.
 * Run from supabase-project root.
 * Uses: npx ts-node scripts/import-firebase-export.ts
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env)
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
dotenv.config({ path: path.join(__dirname, '../sitehub-admin/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// From supabase-project: sitehub-admin/firebase-export/<latest>
const projectRoot = path.resolve(__dirname, '..');
const exportBase = path.join(projectRoot, 'sitehub-admin', 'firebase-export');
const dateDirs = fs.existsSync(exportBase) ? fs.readdirSync(exportBase).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse() : [];
const EXPORT_DIR = dateDirs.length > 0 ? path.join(exportBase, dateDirs[0]) : path.join(exportBase, '2026-02-15');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'firebase_staging' } }
);

// Convert _timestamp object or ISO string to ISO8601
function toTimestamp(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '_timestamp' in v) {
    return (v as { _timestamp: string })._timestamp;
  }
  return null;
}

// Extract timestamp string for created_at etc.
function ts(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return toTimestamp(v);
}

async function loadJson<T>(filename: string): Promise<T> {
  const p = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(p)) return [] as unknown as T;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function main() {
  // Use public schema for raw insert - we'll use RPC or direct SQL for firebase_staging
  if (!fs.existsSync(EXPORT_DIR)) {
    throw new Error(`Export directory not found: ${EXPORT_DIR}`);
  }
  console.log(`Loading from ${EXPORT_DIR}`);

  // Load all JSON files
  const companies = await loadJson<Array<Record<string, unknown>>>('companies.json');
  const users = await loadJson<Array<Record<string, unknown>>>('users.json');
  const sites = await loadJson<Array<Record<string, unknown>>>('sites.json');
  const tasks = await loadJson<Array<Record<string, unknown>>>('tasks.json');
  const notices = await loadJson<Array<Record<string, unknown>>>('notices.json');
  const deliveries = await loadJson<Array<Record<string, unknown>>>('deliveries.json');
  const profiles = await loadJson<Array<Record<string, unknown>>>('profiles.json');
  const settings = await loadJson<Array<Record<string, unknown>>>('settings.json');
  const profilesCerts = await loadJson<Array<{ profileId: string; docs: Array<Record<string, unknown>> }>>('profiles__certifications.json');
  const profilesTraining = await loadJson<Array<{ profileId: string; docs: Array<Record<string, unknown>> }>>('profiles__training.json');
  const usersProfile = await loadJson<Array<{ userId: string; docs: Array<Record<string, unknown>> }>>('users__profile.json');
  const usersPreInduction = await loadJson<Array<{ userId: string; docs: Array<Record<string, unknown>> }>>('users__preInductionProfile.json');

  // Transform and insert via raw SQL using REST - we need to use the Supabase client
  // The client uses 'public' by default; firebase_staging needs schema prefix
  // Use .schema('firebase_staging') for the client

  const staging = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'firebase_staging' } }
  );

  // Companies
  if (companies.length > 0) {
    const rows = companies.map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ''),
      created_at: ts(c, 'createdAt') ?? new Date().toISOString()
    }));
    const { error } = await staging.from('companies').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`companies: ${error.message}`);
    console.log(`Loaded ${rows.length} companies`);
  }

  // Users
  if (users.length > 0) {
    const rows = users.map((u) => ({
      id: String(u.id ?? u.uid),
      email: String(u.email ?? ''),
      company_id: u.companyId ? String(u.companyId) : null,
      role: String(u.role ?? 'operative'),
      profile_id: u.profileId ? String(u.profileId) : null,
      status: u.status ? String(u.status) : null,
      created_at: ts(u, 'createdAt') ?? new Date().toISOString(),
      disabled: Boolean(u.disabled),
      approved: Boolean(u.approved),
      superuser: Boolean(u.superuser)
    }));
    const { error } = await staging.from('users').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`users: ${error.message}`);
    console.log(`Loaded ${rows.length} users`);
  }

  // Sites
  if (sites.length > 0) {
    const rows = sites.map((s) => ({
      id: String(s.id),
      company_id: s.companyId ? String(s.companyId) : null,
      name: String(s.name ?? ''),
      created_at: ts(s, 'createdAt') ?? new Date().toISOString(),
      assigned_users: s.assignedUsers ? JSON.stringify(s.assignedUsers) : null,
      rams_version: s.ramsVersion ? String(s.ramsVersion) : null,
      main_contractor_id: s.managerId ? String(s.managerId) : null,
      location: s.location ? JSON.stringify(s.location) : null,
      geofence: s.geofence ? JSON.stringify(s.geofence) : null,
      latitude: typeof s.latitude === 'number' ? s.latitude : null,
      longitude: typeof s.longitude === 'number' ? s.longitude : null,
      radius_meters: typeof s.radiusMeters === 'number' ? s.radiusMeters : null
    }));
    const { error } = await staging.from('sites').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`sites: ${error.message}`);
    console.log(`Loaded ${rows.length} sites`);
  }

  // Tasks
  if (tasks.length > 0) {
    const rows = tasks.map((t) => ({
      id: String(t.id),
      site_id: t.siteId ? String(t.siteId) : null,
      company_id: t.companyId ? String(t.companyId) : null,
      assigned_to: t.assignedTo ? String(t.assignedTo) : null,
      status: String(t.status ?? 'pending'),
      description: String(t.description ?? t.title ?? ''),
      created_at: ts(t, 'createdAt') ?? new Date().toISOString()
    }));
    const { error } = await staging.from('tasks').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`tasks: ${error.message}`);
    console.log(`Loaded ${rows.length} tasks`);
  }

  // Notices
  if (notices.length > 0) {
    const rows = notices.map((n) => ({
      id: String(n.id),
      site_id: n.siteId ? String(n.siteId) : null,
      company_id: n.companyId ? String(n.companyId) : null,
      title: String(n.title ?? ''),
      body: String(n.body ?? ''),
      attachments: n.attachments ? JSON.stringify(n.attachments) : null,
      created_at: ts(n, 'createdAt') ?? new Date().toISOString()
    }));
    const { error } = await staging.from('notices').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`notices: ${error.message}`);
    console.log(`Loaded ${rows.length} notices`);
  }

  // Deliveries
  if (deliveries.length > 0) {
    const rows = deliveries.map((d) => ({
      id: String(d.id),
      site_id: d.siteId ? String(d.siteId) : null,
      company_id: d.companyId ? String(d.companyId) : null,
      delivered_by: d.createdBy ? String(d.createdBy) : null,
      proof_photos: d.podUrl || d.loadUrl
        ? JSON.stringify([d.podUrl, d.loadUrl].filter(Boolean))
        : null,
      created_at: ts(d, 'createdAt') ?? new Date().toISOString(),
      reference: d.reference ? String(d.reference) : null,
      status: d.status ? String(d.status) : null,
      scheduled_at: ts(d, 'scheduledAt'),
      notes: d.notes ? String(d.notes) : null,
      pod_url: d.podUrl ? String(d.podUrl) : null,
      load_url: d.loadUrl ? String(d.loadUrl) : null,
      wholesaler: d.wholesaler ? String(d.wholesaler) : null,
      site: d.site ? String(d.site) : null
    }));
    const { error } = await staging.from('deliveries').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`deliveries: ${error.message}`);
    console.log(`Loaded ${rows.length} deliveries`);
  }

  // Settings - Firebase may key by user or company; companyId can be name
  if (settings.length > 0) {
    const rows = settings.map((s, i) => ({
      id: typeof s.id === 'string' ? s.id : `settings-${i}`,
      company_id: null,
      config: JSON.stringify(s.display || s.config || s)
    }));
    const { error } = await staging.from('settings').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(`settings: ${error.message}`);
    console.log(`Loaded ${rows.length} settings`);
  }

  // Certifications (from profiles__certifications)
  const certRows: Array<Record<string, unknown>> = [];
  for (const pc of profilesCerts) {
    for (const doc of pc.docs) {
      if (doc.id === 'data') continue;
      certRows.push({
        id: String(doc.id),
        profile_id: pc.profileId,
        user_id: null, // will need profile -> user lookup
        type: String(doc.title ?? doc.type ?? ''),
        issued_at: ts(doc, 'issueDate') ?? ts(doc, 'createdAt') ?? new Date().toISOString(),
        expires_at: ts(doc, 'expiryDate'),
        attachment_url: doc.attachmentUrl ? String(doc.attachmentUrl) : null,
        attachment_type: doc.attachmentType ? String(doc.attachmentType) : null
      });
    }
  }
  // Get user_id from profiles
  for (const p of profiles) {
    const userId = p.userId ? String(p.userId) : null;
    if (userId) {
      for (const c of certRows) {
        if (c.profile_id === p.id) (c as Record<string, unknown>).user_id = userId;
      }
    }
  }
  if (certRows.length > 0) {
    const { error } = await staging.from('certifications').upsert(certRows as never[], { onConflict: 'id' });
    if (error) throw new Error(`certifications: ${error.message}`);
    console.log(`Loaded ${certRows.length} certifications`);
  }

  // Training (from profiles__training)
  const trainRows: Array<Record<string, unknown>> = [];
  for (const pt of profilesTraining) {
    for (const doc of pt.docs) {
      if (doc.id === 'data') continue;
      trainRows.push({
        id: String(doc.id),
        profile_id: pt.profileId,
        user_id: null,
        type: String(doc.title ?? doc.type ?? ''),
        completed_at: ts(doc, 'completedAt') ?? ts(doc, 'createdAt') ?? new Date().toISOString(),
        attachment_url: doc.attachmentUrl ? String(doc.attachmentUrl) : null,
        attachment_type: doc.attachmentType ? String(doc.attachmentType) : null
      });
    }
  }
  for (const p of profiles) {
    const userId = p.userId ? String(p.userId) : null;
    if (userId) {
      for (const t of trainRows) {
        if (t.profile_id === p.id) (t as Record<string, unknown>).user_id = userId;
      }
    }
  }
  if (trainRows.length > 0) {
    const { error } = await staging.from('training').upsert(trainRows as never[], { onConflict: 'id' });
    if (error) throw new Error(`training: ${error.message}`);
    console.log(`Loaded ${trainRows.length} training`);
  }

  // User profile data (from users__profile)
  for (const up of usersProfile) {
    for (const doc of up.docs) {
      if (doc.id !== 'data') continue;
      const d = doc as Record<string, unknown>;
      await staging.from('user_profile_data').upsert(
        {
          user_id: up.userId,
          address: d.addressLine1 ? String(d.addressLine1) : d.address ? String(d.address) : null,
          town: d.town ? String(d.town) : null,
          postcode: d.postcode ? String(d.postcode) : null,
          date_of_birth: d.dateOfBirth ? String(d.dateOfBirth) : null,
          job_title: d.jobTitle ? String(d.jobTitle) : null,
          emergency_contact_name: d.emergencyContactName ? String(d.emergencyContactName) : null,
          emergency_contact_phone: d.emergencyContactPhone ? String(d.emergencyContactPhone) : null,
          national_insurance: d.niNumber ? String(d.niNumber) : d.nationalInsurance ? String(d.nationalInsurance) : null,
          utr: d.utrNumber ? String(d.utrNumber) : d.utr ? String(d.utr) : null
        },
        { onConflict: 'user_id' }
      );
    }
  }
  if (usersProfile.length > 0) console.log(`Loaded user_profile_data for ${usersProfile.length} users`);

  // Pre-induction (from users__preInductionProfile)
  for (const upi of usersPreInduction) {
    for (const doc of upi.docs) {
      const d = doc as Record<string, unknown>;
      const section = String(doc.id);
      if (section === 'personal') {
        await staging.from('pre_induction_personal').upsert(
          {
            user_id: upi.userId,
            full_name: d.fullName ? String(d.fullName) : null,
            date_of_birth: d.dateOfBirth ? String(d.dateOfBirth) : null,
            phone: d.phone ? String(d.phone) : null,
            email: d.email ? String(d.email) : null,
            address: d.address ? String(d.address) : null,
            emergency_contact_name: d.emergencyContactName ? String(d.emergencyContactName) : null,
            emergency_contact_relationship: d.emergencyContactRelationship ? String(d.emergencyContactRelationship) : null,
            emergency_contact_phone: d.emergencyContactPhone ? String(d.emergencyContactPhone) : null,
            national_insurance: d.nationalInsuranceNumber ? String(d.nationalInsuranceNumber) : null,
            utr: d.utrNumber ? String(d.utrNumber) : null
          },
          { onConflict: 'user_id' }
        );
      } else if (section === 'declarations') {
        await staging.from('pre_induction_declarations').upsert(
          {
            user_id: upi.userId,
            operative_declaration_accepted: Boolean(d.operativeDeclarationAccepted),
            operative_declaration_accepted_at: ts(d, 'operativeDeclarationAcceptedAt')
          },
          { onConflict: 'user_id' }
        );
      }
    }
  }
  if (usersPreInduction.length > 0) console.log(`Loaded pre_induction for ${usersPreInduction.length} users`);

  console.log('Firebase export import complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
