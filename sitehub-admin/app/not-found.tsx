import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f3f7fb] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center rounded-2xl border border-white/80 bg-white/90 p-10 shadow-xl shadow-blue-600/10">
        <p className="text-sm font-semibold text-blue-600">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          That page does not exist or you do not have access to it.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
