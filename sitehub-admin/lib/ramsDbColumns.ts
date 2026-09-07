/**
 * Legacy export — RAMS API routes use `.select("*")` so every DB shape works.
 * This module remains so older imports (or cached builds) do not fail.
 */
export const RAMS_SELECT_COLUMNS =
  "id,title,url,site_id,company_id,status,version,created_at,updated_at,description";
