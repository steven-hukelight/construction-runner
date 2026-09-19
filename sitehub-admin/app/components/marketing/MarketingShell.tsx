export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-[center_70%]"
        style={{ backgroundImage: "url('/marketing/construction-site.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-[rgba(22,42,74,0.32)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
