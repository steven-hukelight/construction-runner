export default function RAMSTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-white/10 rounded w-40" />
      <div className="card space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 bg-white/5 rounded" />
        ))}
      </div>
    </div>
  );
}
