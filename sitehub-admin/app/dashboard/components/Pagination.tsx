"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Pagination({ page, totalPages, onChange }: any) {
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-40"
      >
        Prev
      </button>

      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>

      <button
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
