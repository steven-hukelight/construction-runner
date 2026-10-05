# Plan: private medical, certifications and training buckets, and signature links

Status: plan only, nothing applied. Written 2026-10-05 (security phase 2b).

## Current state (counts only)

| Bucket | Public | Objects | Referenced by app code |
|---|---|---|---|
| `medical` | yes | 0 | `POST /api/uploads/medical` (write), `medical_records.file_url` (0 rows with a URL) |
| `certifications` | yes | 0 | none found in `sitehub-admin` or `sitehub_worker_Ready` |
| `training` | yes | 0 | none found |
| `company_documents` | no | 26 | RAMS and briefing signature uploads |

Signature links stored as public-form URLs (`/storage/v1/object/public/company_documents/...`) although the bucket is private, so opening them directly fails today:

| Table | Rows with a signature URL | Of which public-form |
|---|---|---|
| `rams_acknowledgements.signature_url` | 19 | 19 |
| `briefing_acknowledgements.signature_url` | 3 | 3 |
| `pre_induction_declarations.operative_signature_url` | 0 | 0 |

Because the three public buckets are empty, making them private cannot break an existing link.

## 1. Migration (to review, then add under `supabase/migrations/`)

```sql
-- Make medical, certifications and training private. All access goes through the API,
-- which uses the service role and issues short-lived signed URLs.
update storage.buckets
   set public = false
 where id in ('medical', 'certifications', 'training');

-- Optional data fix: store signature references as "bucket/path" instead of a public URL that
-- does not open (bucket is private). Readers below already accept both forms.
update public.rams_acknowledgements
   set signature_url = regexp_replace(signature_url, '^.*/storage/v1/object/public/', '')
 where signature_url like '%/storage/v1/object/public/company_documents/%';

update public.briefing_acknowledgements
   set signature_url = regexp_replace(signature_url, '^.*/storage/v1/object/public/', '')
 where signature_url like '%/storage/v1/object/public/company_documents/%';
```

No `storage.objects` policies are needed for these buckets: neither app reads them with a user JWT. The Flutter app's direct storage calls only touch the `pre-induction` bucket (`lib/utils/pre_induction_upload.dart`, `lib/services/pre_induction_api_service.dart`, `lib/utils/pre_induction_file_url.dart`).

Open question: `certifications` and `training` are unused. Deleting them is simpler than keeping them private; confirm nothing outside these two apps (scripts, other services) writes to them first.

## 2. Signed-URL helper

There is already `lib/storage/signedUrl.ts` (`extractBucketAndPath`, `resolveSignedUrl`) and `GET /api/storage/signed-url`. The gap is authorization: that route signs any path in `medical`, `pre-induction` or `company_documents` for any signed-in user. Proposed helper (`lib/storage/privateFile.ts`):

```ts
import { authorizeActingOnUser } from "@/lib/auth/actingOnUser";
import { createSignedUrl } from "@/supabase/storage/storageClient";
import { extractBucketAndPath } from "@/lib/storage/signedUrl";

/** Owner user id encoded in the object path, for buckets whose paths are per-user. */
export function ownerOfPath(bucket: string, path: string): string | null {
  const parts = path.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) return null;
  if (bucket === "pre-induction") return parts[0] ?? null;                      // <userId>/<section>/<file>
  if (bucket === "medical") return parts[0] === "medical" ? parts[1] ?? null : null; // medical/<userId>/<file>
  if (bucket === "company_documents" && (parts[0] === "rams-signatures" || parts[0] === "briefing-signatures")) {
    return parts[2] ?? null;                                                    // <kind>/<companyId>/<userId>/<file>
  }
  return null;
}

/** Signed URL for a stored reference (public URL, signed URL or "bucket/path"), or a 4xx response. */
export async function signedUrlForCaller(req: Request, storedRef: string, expiresIn = 3600) {
  const ref = extractBucketAndPath(storedRef);
  if (!ref) return { ok: false as const, status: 400, error: "Invalid storage URL" };
  const owner = ownerOfPath(ref.bucket, ref.path);
  if (!owner) return { ok: false as const, status: 403, error: "Bucket not allowed" };
  const access = await authorizeActingOnUser(req, owner);
  if (!access.ok) return { ok: false as const, status: access.response.status, error: "Forbidden" };
  return { ok: true as const, url: await createSignedUrl(ref.bucket, ref.path, expiresIn) };
}
```

`GET /api/storage/signed-url` would call `signedUrlForCaller` for per-user buckets. Company-scoped buckets (`rams`, `briefings`, `asset_*`, `near_miss_reports`, `uploads`) need a separate company check from the owning row and are out of scope for this plan.

Writers keep their response keys but store a reference rather than a public URL:

- `POST /api/rams/upload-signature` and `POST /api/briefings/upload-signature`: keep `{ signatureUrl }`, set it to `company_documents/<path>`. The Flutter app only passes this value back to `/api/rams/acknowledge` and `/api/briefings/accept`; it never opens it.
- `POST /api/uploads/medical`: keep `{ ok, fileUrl }`, set `fileUrl` and `medical_records.file_url` to `medical/<storage path>`.

## 3. Every place that stores or reads these URLs

### Web (`sitehub-admin`)

Writes:
- `app/api/uploads/medical/route.ts` — uploads to `medical`, builds a `/object/public/medical/...` URL, inserts `medical_records.file_url`.
- `app/api/rams/upload-signature/route.ts` — uploads to `company_documents/rams-signatures/...`, returns `getPublicUrl`.
- `app/api/briefings/upload-signature/route.ts` — same for `briefing-signatures/...`.
- `app/api/rams/acknowledge/route.ts` — stores `rams_acknowledgements.signature_url` from the body.
- `app/api/briefings/accept/route.ts` — stores `briefing_acknowledgements.signature_url` from the body.
- `app/api/pre-induction/[userId]/declarations/route.ts`, `lib/myInfo.ts` (`writeMyInfo`), `app/dashboard/users/[userId]/pre-induction/clientActions.ts` — store `pre_induction_declarations.operative_signature_url`.
- `app/dashboard/users/[userId]/my-info/MyInfoEditor.tsx` — free-text input for `operativeSignatureUrl`.

Reads:
- `app/api/users/[id]/medical/route.ts` — returns `medical_records.file_url`.
- `app/dashboard/operatives/[id]/OperativeProfileClient.tsx` — opens `file_url` as a plain `href` (would break once private; switch to `openDocumentUrl`). Also calls `POST /api/uploads/medical`.
- `app/dashboard/profile/page.tsx` — opens medical and certification `fileUrl` via `openDocumentUrl`.
- `app/api/briefings/[id]/acknowledgements/route.ts` — returns `signatureUrl`.
- `app/dashboard/health-and-safety/briefings/BriefingDetailModal.tsx` — opens `signatureUrl` via `openDocumentUrl`.
- `app/api/rams/[id]/acknowledgements/route.ts`, `app/api/rams/report/pdf/route.ts`, `app/api/briefings/report/route.ts`, `app/api/briefings/report/pdf/route.ts` — read `signature_url` only as a yes/no flag.
- `lib/myInfo.ts` (`readMyInfo`), `app/dashboard/users/[userId]/pre-induction/server.ts` — read `operative_signature_url`.
- `lib/openDocumentUrl.ts`, `lib/storage/signedUrl.ts`, `app/api/storage/signed-url/route.ts` — resolve any stored URL to a signed URL.

### Flutter (`sitehub_worker_Ready`)

- `lib/services/rams_api_service.dart` — `uploadSignature` reads `signatureUrl`; `acknowledgeDocument` sends it back.
- `lib/services/briefings_api_service.dart` — same pair for briefings.
- `lib/screens/ra_ms_detail_screen.dart`, `lib/screens/health_safety/briefings_screen.dart` — call the two services above; do not display the URL.
- `lib/services/pre_induction_api_service.dart` — reads and writes `operative_signature_url` with the pre-induction sections.
- No Flutter code reads `medical`, `certifications` or `training` bucket URLs.

## 4. Rollout order

1. Ship the `signedUrlForCaller` helper and the `/api/storage/signed-url` ownership check.
2. Switch `OperativeProfileClient.tsx` to `openDocumentUrl`.
3. Change the three writers to store `bucket/path` references.
4. Apply the migration (buckets private, optional signature data fix).
5. Verify: anonymous request to a `/object/public/medical/...` URL returns 400/404; owner and same-company manager can open a signature through the dashboard; operative of another company gets 403 from `/api/storage/signed-url`.

Status (phase 2c-1): steps 1 and 2 are done. The check lives in `lib/storage/privateFile.ts` (`storageScope`, `authorizeStorageRead`) and also covers the company-scoped buckets through row lookups. Covered by `app/api/__tests__/storageSignedUrl.test.ts`. Steps 3–5 are not started.
