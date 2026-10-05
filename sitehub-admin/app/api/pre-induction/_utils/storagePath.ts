/** One path component made only of letters, digits, `.`, `_` or `-`, and not `.` or `..`. */
export function isSafePathSegment(segment: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..";
}

/** Rejects empty, `.` and `..` segments so `userId/../otherUser/file` cannot escape the owner's folder. */
export function hasTraversalSegment(path: string): boolean {
  return path.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}
