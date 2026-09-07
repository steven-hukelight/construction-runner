"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error.message, error.digest ? `(digest: ${error.digest})` : "");
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Something went wrong
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
        An error occurred while rendering this page. Try refreshing or signing in again.
      </p>
      {process.env.NODE_ENV === "development" && error.digest && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono">
          Digest: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try again
        </button>
        <a
          href="/admin/login"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
