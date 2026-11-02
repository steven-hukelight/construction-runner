/**
 * Server + client: max RAMS PDF upload size.
 * Web uploads go straight to Storage (`lib/storage/stagedUpload.ts`), so this is not bound by the function body limit.
 */
export const RAMS_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const RAMS_MAX_UPLOAD_LABEL = "50 MB";
