#!/usr/bin/env node
/**
 * Import Firebase export JSON into firebase_staging.
 * Run: node scripts/import-firebase-export.cjs
 *
 * Uses DATABASE_URL (direct Postgres) when set - avoids API schema restrictions.
 * Otherwise uses Supabase API (requires firebase_staging in Dashboard > API > Exposed schemas).
 */

const path = require('path');
const fs = require('fs');
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'sitehub-admin', '.env'),
  path.join(__dirname, '..', '..', 'sitehub-admin', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    break;
  }
}

const candidates = [
  path.join(__dirname, '..', '..', 'sitehub-admin', 'firebase-export'),
  path.join(__dirname, '..', 'sitehub-admin', 'firebase-export'),
];
const exportBase = candidates.find((p) => fs.existsSync(p)) || candidates[0];
const dateDirs = fs.existsSync(exportBase) ? fs.readdirSync(exportBase).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse() : [];
const EXPORT_DIR = dateDirs.length > 0 ? path.join(exportBase, dateDirs[0]) : path.join(exportBase, '2026-02-15');

const USE_PG = !!process.env.DATABASE_URL;
let supabase;
let pgClient;

if (USE_PG) {
  const { Client } = require('pg');
  pgClient = new Client({ connectionString: process.env.DATABASE_URL });
} else {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: 'firebase_staging' } }
  );
}

function toTimestamp(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && v._timestamp) return v._timestamp;
  return null;
}

function ts(obj, key) {
  return toTimestamp(obj[key]);
}

function loadJson(filename) {
  const p = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function upsert(table, rows, conflictKey = 'id') {
  if (!rows?.length) return;
  if (USE_PG) {
    const cols = Object.keys(rows[0]);
    const placeholders = rows.map((_, i) =>
      '(' + cols.map((_, j) => '$' + (i * cols.length + j + 1)).join(',') + ')'
    ).join(',');
    const vals = rows.flatMap((r) => cols.map((c) => r[c] ?? null));
    const setCols = cols.filter((c) => c !== conflictKey);
    const setClause = setCols.map((c) => `${c} = excluded.${c}`).join(', ');
    const sql = `INSERT INTO firebase_staging.${table} (${cols.join(',')}) VALUES ${placeholders} ON CONFLICT (${conflictKey}) DO UPDATE SET ${setClause}`;
    await pgClient.query(sql, vals);
  } else {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictKey });
    if (error) throw new Error(table + ': ' + error.message);
  }
}

async function main() {
  if (!fs.existsSync(EXPORT_DIR)) throw new Error('Export dir not found: ' + EXPORT_DIR);
  console.log('Loading from', EXPORT_DIR);
  if (USE_PG) {
    await pgClient.connect();
    console.log('Using direct Postgres (DATABASE_URL)');
  } else {
    console.log('Using Supabase API (add firebase_staging to Exposed schemas if you see "Invalid schema")');
  }

  const companies = loadJson('companies.json');
  const users = loadJson('users.json');
  const sites = loadJson('sites.json');
  const tasks = loadJson('tasks.json');
  const notices = loadJson('notices.json');
  const deliveries = loadJson('deliveries.json');
  const profiles = loadJson('profiles.json');
  const settings = loadJson('settings.json');
  const profilesCerts = loadJson('profiles__certifications.json');
  const profilesTraining = loadJson('profiles__training.json');
  const usersProfile = loadJson('users__profile.json');
  const usersPreInduction = loadJson('users__preInductionProfile.json');

  if (companies.length) {
    const rows = companies.map((c) => ({
      id: String(c.id),
      name: String(c.name || ''),
      created_at: ts(c, 'createdAt') || new Date().toISOString()
    }));
    await upsert('companies', rows);
    console.log('Loaded', rows.length, 'companies');
  }

  if (users.length) {
    const rows = users.map((u) => ({
      id: String(u.id || u.uid),
      email: String(u.email || ''),
      company_id: u.companyId ? String(u.companyId) : null,
      role: String(u.role || 'operative'),
      profile_id: u.profileId ? String(u.profileId) : null,
      status: u.status ? String(u.status) : null,
      created_at: ts(u, 'createdAt') || new Date().toISOString(),
      disabled: Boolean(u.disabled),
      approved: Boolean(u.approved),
      superuser: Boolean(u.superuser)
    }));
    await upsert('users', rows);
    console.log('Loaded', rows.length, 'users');
  }

  if (sites.length) {
    const rows = sites.map((s) => ({
      id: String(s.id),
      company_id: s.companyId ? String(s.companyId) : null,
      name: String(s.name || ''),
      created_at: ts(s, 'createdAt') || new Date().toISOString(),
      assigned_users: s.assignedUsers ? JSON.stringify(s.assignedUsers) : null,
      rams_version: s.ramsVersion ? String(s.ramsVersion) : null,
      main_contractor_id: s.managerId ? String(s.managerId) : null,
      location: s.location ? JSON.stringify(s.location) : null,
      geofence: s.geofence ? JSON.stringify(s.geofence) : null,
      latitude: typeof s.latitude === 'number' ? s.latitude : null,
      longitude: typeof s.longitude === 'number' ? s.longitude : null,
      radius_meters: typeof s.radiusMeters === 'number' ? s.radiusMeters : null
    }));
    await upsert('sites', rows);
    console.log('Loaded', rows.length, 'sites');
  }

  if (tasks.length) {
    const rows = tasks.map((t) => ({
      id: String(t.id),
      site_id: t.siteId ? String(t.siteId) : null,
      company_id: t.companyId ? String(t.companyId) : null,
      assigned_to: t.assignedTo ? String(t.assignedTo) : null,
      status: String(t.status || 'pending'),
      description: String(t.description || t.title || ''),
      created_at: ts(t, 'createdAt') || new Date().toISOString()
    }));
    await upsert('tasks', rows);
    console.log('Loaded', rows.length, 'tasks');
  }

  if (notices.length) {
    const rows = notices.map((n) => ({
      id: String(n.id),
      site_id: n.siteId ? String(n.siteId) : null,
      company_id: n.companyId ? String(n.companyId) : null,
      title: String(n.title || ''),
      body: String(n.body || ''),
      attachments: n.attachments ? JSON.stringify(n.attachments) : null,
      created_at: ts(n, 'createdAt') || new Date().toISOString()
    }));
    await upsert('notices', rows);
    console.log('Loaded', rows.length, 'notices');
  }

  if (deliveries.length) {
    const rows = deliveries.map((d) => ({
      id: String(d.id),
      site_id: d.siteId ? String(d.siteId) : null,
      company_id: d.companyId ? String(d.companyId) : null,
      delivered_by: d.createdBy ? String(d.createdBy) : null,
      proof_photos: (d.podUrl || d.loadUrl) ? JSON.stringify([d.podUrl, d.loadUrl].filter(Boolean)) : null,
      created_at: ts(d, 'createdAt') || new Date().toISOString(),
      reference: d.reference ? String(d.reference) : null,
      status: d.status ? String(d.status) : null,
      scheduled_at: ts(d, 'scheduledAt'),
      notes: d.notes ? String(d.notes) : null,
      pod_url: d.podUrl ? String(d.podUrl) : null,
      load_url: d.loadUrl ? String(d.loadUrl) : null,
      wholesaler: d.wholesaler ? String(d.wholesaler) : null,
      site: d.site ? String(d.site) : null
    }));
    await upsert('deliveries', rows);
    console.log('Loaded', rows.length, 'deliveries');
  }

  if (settings.length) {
    const rows = settings.map((s, i) => ({
      id: typeof s.id === 'string' ? s.id : 'settings-' + i,
      company_id: null,
      config: JSON.stringify(s.display || s.config || s)
    }));
    await upsert('settings', rows);
    console.log('Loaded', rows.length, 'settings');
  }

  const certRows = [];
  for (const pc of profilesCerts) {
    for (const doc of pc.docs) {
      if (doc.id === 'data') continue;
      certRows.push({
        id: String(doc.id),
        profile_id: pc.profileId,
        user_id: null,
        type: String(doc.title || doc.type || ''),
        issued_at: ts(doc, 'issueDate') || ts(doc, 'createdAt') || new Date().toISOString(),
        expires_at: ts(doc, 'expiryDate'),
        attachment_url: doc.attachmentUrl ? String(doc.attachmentUrl) : null,
        attachment_type: doc.attachmentType ? String(doc.attachmentType) : null
      });
    }
  }
  for (const p of profiles) {
    if (p.userId) {
      for (const c of certRows) {
        if (c.profile_id === p.id) c.user_id = String(p.userId);
      }
    }
  }
  if (certRows.length) {
    await upsert('certifications', certRows);
    console.log('Loaded', certRows.length, 'certifications');
  }

  const trainRows = [];
  for (const pt of profilesTraining) {
    for (const doc of pt.docs) {
      if (doc.id === 'data') continue;
      trainRows.push({
        id: String(doc.id),
        profile_id: pt.profileId,
        user_id: null,
        type: String(doc.title || doc.type || ''),
        completed_at: ts(doc, 'completedAt') || ts(doc, 'createdAt') || new Date().toISOString(),
        attachment_url: doc.attachmentUrl ? String(doc.attachmentUrl) : null,
        attachment_type: doc.attachmentType ? String(doc.attachmentType) : null
      });
    }
  }
  for (const p of profiles) {
    if (p.userId) {
      for (const t of trainRows) {
        if (t.profile_id === p.id) t.user_id = String(p.userId);
      }
    }
  }
  if (trainRows.length) {
    await upsert('training', trainRows);
    console.log('Loaded', trainRows.length, 'training');
  }

  const profileDataRows = [];
  for (const up of usersProfile) {
    for (const doc of up.docs) {
      if (doc.id !== 'data') continue;
      const d = doc;
      profileDataRows.push({
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
      });
    }
  }
  if (profileDataRows.length) {
    await upsert('user_profile_data', profileDataRows, 'user_id');
    console.log('Loaded user_profile_data for', profileDataRows.length, 'users');
  }

  const preInductionPersonalRows = [];
  const preInductionDeclRows = [];
  for (const upi of usersPreInduction) {
    for (const doc of upi.docs) {
      const d = doc;
      if (doc.id === 'personal') {
        preInductionPersonalRows.push({
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
        });
      } else if (doc.id === 'declarations') {
        preInductionDeclRows.push({
          user_id: upi.userId,
          operative_declaration_accepted: Boolean(d.operativeDeclarationAccepted),
          operative_declaration_accepted_at: ts(d, 'operativeDeclarationAcceptedAt')
        });
      }
    }
  }
  if (preInductionPersonalRows.length) {
    await upsert('pre_induction_personal', preInductionPersonalRows, 'user_id');
    console.log('Loaded pre_induction_personal for', preInductionPersonalRows.length, 'users');
  }
  if (preInductionDeclRows.length) {
    await upsert('pre_induction_declarations', preInductionDeclRows, 'user_id');
    console.log('Loaded pre_induction_declarations for', preInductionDeclRows.length, 'users');
  }

  if (USE_PG) await pgClient.end();
  console.log('Firebase export import complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
