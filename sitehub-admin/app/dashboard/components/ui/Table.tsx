"use client";

import React from "react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

type Density = "compact" | "comfortable" | "spacious";

const densityClasses: Record<Density, { rowPad: string; cellPad: string; textSize: string; headerH: string; rowMinH: string }> = {
	compact: { rowPad: "py-2.5", cellPad: "px-4", textSize: "text-sm", headerH: "h-12", rowMinH: "min-h-[48px]" },
	comfortable: { rowPad: "py-3.5", cellPad: "px-5", textSize: "text-sm", headerH: "h-12", rowMinH: "min-h-[52px]" },
	spacious: { rowPad: "py-4", cellPad: "px-6", textSize: "text-base", headerH: "h-14", rowMinH: "min-h-[56px]" },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function Table({ columns, data, density: densityProp, emptyMessage }: any) {
	const { tableDensity } = useDisplayPreferences();
	const density: Density = (densityProp ?? tableDensity) in densityClasses ? (densityProp ?? tableDensity) as Density : "comfortable";
	const { rowPad, cellPad, textSize, rowMinH } = densityClasses[density];
	const isEmpty = !data || data.length === 0;

	return (
		<div className="data-table-wrapper rounded-xl overflow-hidden border border-gray-200/80 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-none">
			<div className="overflow-x-auto overflow-y-auto max-h-[560px] min-h-[200px]">
				<table className={`data-table w-full table-auto ${textSize}`}>
					<thead className="sticky top-0 z-10">
						<tr className="data-table-header border-b border-gray-200/90 dark:border-slate-600 bg-gray-50/80 dark:bg-slate-900/90 backdrop-blur-sm">
							{columns.map((col: any, i: number) => (
								<th key={i} className={`${cellPad} ${rowPad} text-left text-[13px] font-semibold tracking-wide text-gray-600 dark:text-slate-400 uppercase`}>
									{col.header || col.label || col.key}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{isEmpty ? (
							<tr>
								<td colSpan={columns.length} className="py-16 text-center text-gray-500 dark:text-slate-400 text-sm">
									{emptyMessage ?? "No data"}
								</td>
							</tr>
						) : (
							data.map((row: any, i: number) => (
								<tr
									key={i}
									className={`data-table-row group transition-all duration-150 ${rowMinH} ${i % 2 === 1 ? "bg-gray-50/40 dark:bg-slate-800/60" : "bg-white dark:bg-slate-800"} hover:bg-blue-50/50 dark:hover:bg-slate-700/80 border-b border-gray-100/80 dark:border-slate-700/60 last:border-b-0`}
								>
									{columns.map((col: any, j: number) => {
										const content = col.render ? col.render(row) : (row[col.accessor || col.key || col.label] ?? "—");
										const isMuted = col.type === "date" || col.type === "secondary";
										const isNumeric = col.type === "numeric";
										return (
											<td
												key={j}
												className={`${cellPad} ${rowPad} align-middle ${isNumeric ? "text-right tabular-nums" : ""}`}
											>
												{isMuted && typeof content === "string" ? (
													<span className="table-cell-muted">{content}</span>
												) : (
													content
												)}
											</td>
										);
									})}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default React.memo(Table);
