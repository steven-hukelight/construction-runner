"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Table({ columns, data }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto min-h-[280px]">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col: any) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-medium text-gray-700"
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
                className="border-b border-gray-100 hover:bg-gray-50 transition"
              >
                {columns.map((col: any) => (
                  <td key={col.key} className="px-4 py-3 text-gray-800">
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
