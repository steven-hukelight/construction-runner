export default function DashboardLoading() {
  return (
    <div className="relative space-y-8 animate-pulse">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/5 to-cyan-400/5 rounded-full blur-3xl -z-10" />
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-gray-200/80" />
        <div className="h-4 w-72 rounded bg-gray-100/80" />
      </div>
      {/* Card/table skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gray-200/80" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-gray-200/80" />
            <div className="h-4 w-56 rounded bg-gray-100/80" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
