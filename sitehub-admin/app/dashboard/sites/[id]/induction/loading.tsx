export default function SiteInductionLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading induction">
      <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
        <div className="h-5 w-40 rounded bg-gray-200/80 dark:bg-slate-600" />
        <div className="mt-3 h-4 w-72 rounded bg-gray-100/80 dark:bg-slate-700" />
        <div className="mt-6 h-10 w-full max-w-md rounded-lg bg-gray-100/80 dark:bg-slate-700" />
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6">
        <div className="h-5 w-36 rounded bg-gray-200/80 dark:bg-slate-600" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-50 dark:bg-slate-700/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
