/**
 * Server + client: max RAMS PDF upload size.
 * Keep in sync with `experimental.proxyClientMaxBodySize` in `next.config.js` (Next defaults to 10MB otherwise).
 */
export const RAMS_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const RAMS_MAX_UPLOAD_LABEL = "50 MB";
