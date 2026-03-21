"use client";

import React from "react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

type Density = "compact" | "comfortable" | "spacious";

const densityClasses: Record<Density, { rowPad: string; cellPad: string; textSize: string; headerH: string; rowMinH: string }> = {
	compact: { rowPad: "py-2", cellPad: "px-3", textSize: "text-xs", headerH: "h-9", rowMinH: "min-h-9" },
	comfortable: { rowPad: "py-3", cellPad: "px-4", textSize: "text-sm", headerH: "h-11", rowMinH: "min-h-11" },
	spacious: { rowPad: "py-4", cellPad: "px-5", textSize: "text-base", headerH: "h-12", rowMinH: "min-h-12" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function Table({ columns, data, density: densityProp }: any) {
	const { tableDensity } = useDisplayPreferences();
	const density: Density = (densityProp ?? tableDensity) in densityClasses ? (densityProp ?? tableDensity) as Density : "comfortable";
	const { rowPad, cellPad, textSize, headerH, rowMinH } = densityClasses[density];
	return (
		<div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm overflow-hidden">
			<div className="overflow-x-auto overflow-y-auto max-h-[520px] min-h-[280px]">
				<table className={`w-full table-auto ${textSize}`}>
					<thead>
						<tr className={`border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 ${headerH}`}>
							{columns.map((col: any, i: number) => (
								<th key={i} className={`${cellPad} ${rowPad} text-left text-xs font-semibold text-[#6E6E6E] dark:text-slate-400 uppercase tracking-wide`}>
									{col.header || col.label || col.key}
								</th>
							))}
						</tr>
					</thead>

					<tbody className="divide-y divide-gray-100 dark:divide-slate-600">
							{data.map((row: any, i: number) => (
								<tr key={i} className={`group hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${rowMinH}`}>
									{columns.map((col: any, j: number) => (
										<td key={j} className={`${cellPad} ${rowPad} text-[#1A1A1A] dark:text-slate-200`}>
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
