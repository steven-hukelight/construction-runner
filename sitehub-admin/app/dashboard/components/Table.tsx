"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Table({ columns, data }: any) {
  return (
    <div className="data-table-wrapper w-full min-w-0 overflow-hidden rounded-2xl border border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(37,76,128,0.07)] dark:border-slate-600 dark:bg-slate-800">
      <div className="min-h-[160px] overflow-x-auto">
        <table className="data-table w-full table-auto text-sm">
          <thead>
            <tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] dark:border-slate-600 dark:bg-slate-900/90">
              {columns.map((col: any) => (
                <th
                  key={col.key}
                  className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr
                key={i}
                className="data-table-row border-b border-slate-100/90 transition last:border-b-0 hover:bg-blue-50/70 dark:border-slate-700/60"
              >
                {columns.map((col: any) => (
                  <td key={col.key} className="px-5 py-3.5 text-slate-800 dark:text-slate-100">
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
