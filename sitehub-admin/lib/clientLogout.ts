/** Clears HttpOnly auth cookies via the logout API. document.cookie cannot. */
export async function clearServerAuthCookies(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* navigation still proceeds */
  }
}
