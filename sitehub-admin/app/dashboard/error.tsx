"use client";

/**
 * Catches runtime errors in Server Components under /dashboard (and shows digest for support).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center space-y-4">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Something went wrong
      </h1>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        This dashboard page could not be loaded. You can try again, or contact support with reference:{" "}
        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {error.digest ?? "—"}
        </code>
      </p>
      <button
        type="button"
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
