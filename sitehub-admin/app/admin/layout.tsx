/**
 * Minimal layout for admin auth pages (login, etc).
 * No marketing content, no sidebar, secure and minimal.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {children}
    </div>
  );
}
