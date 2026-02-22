"use client";

import React from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
function Table({ columns, data, density = "compact" }: any) {
	const rowPad = density === "comfortable" ? "py-3.5" : density === "default" ? "py-3" : "py-2.5";
	const cellPad = density === "comfortable" ? "px-5" : "px-4";
	return (
		<div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
			<div className="overflow-x-auto overflow-y-auto max-h-[520px] min-h-[280px]">
				<table className="w-full table-auto text-sm">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							{columns.map((col: any, i: number) => (
								<th key={i} className={`${cellPad} ${rowPad} h-11 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wide`}>
									{col.header || col.label || col.key}
								</th>
							))}
						</tr>
					</thead>

					<tbody className="divide-y divide-gray-100">
							{data.map((row: any, i: number) => (
								<tr key={i} className="group hover:bg-gray-50 transition-colors h-12">
									{columns.map((col: any, j: number) => (
										<td key={j} className={`${cellPad} ${rowPad} text-sm text-[#1A1A1A]`}>
										{col.render
											? col.render(row)
											: row[col.accessor || col.key || col.label] ?? ""}
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

export default React.memo(Table);
