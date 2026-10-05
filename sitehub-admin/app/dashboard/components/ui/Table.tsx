"use client";

import React, { type ReactNode } from "react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { TableToolbar } from "./TableChrome";

type Density = "compact" | "comfortable" | "spacious";

const densityClasses: Record<Density, { rowPad: string; cellPad: string; textSize: string; headerH: string; rowMinH: string }> = {
	compact: { rowPad: "py-2.5", cellPad: "px-4", textSize: "text-sm", headerH: "h-12", rowMinH: "min-h-[48px]" },
	comfortable: { rowPad: "py-3.5", cellPad: "px-5", textSize: "text-sm", headerH: "h-12", rowMinH: "min-h-[52px]" },
	spacious: { rowPad: "py-4", cellPad: "px-6", textSize: "text-base", headerH: "h-14", rowMinH: "min-h-[56px]" },
};

type TableProps = {
	columns: any[];
	data: any[];
	density?: Density;
	emptyMessage?: ReactNode;
	toolbar?: ReactNode;
	title?: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	extra?: ReactNode;
	embedded?: boolean;
	/** Background class for rows that need action (e.g. `bg-red-50`); defaults to white. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rowClassName?: (row: any) => string | undefined;
};

function isBlankCell(value: ReactNode): boolean {
	if (value === null || value === undefined || value === false) return true;
	if (typeof value === "string") {
		const v = value.trim();
		return v === "" || v === "—" || v === "-";
	}
	return false;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Table({
	columns,
	data,
	density: densityProp,
	emptyMessage,
	toolbar,
	title,
	subtitle,
	actions,
	extra,
	embedded,
	rowClassName,
}: TableProps) {
	const { tableDensity } = useDisplayPreferences();
	const density: Density = (densityProp ?? tableDensity) in densityClasses ? (densityProp ?? tableDensity) as Density : "comfortable";
	const { rowPad, cellPad, textSize, rowMinH } = densityClasses[density];
	const isEmpty = !data || data.length === 0;
	const cells: ReactNode[][] = isEmpty
		? []
		: data.map((row: any) =>
				columns.map((col: any) =>
					col.render ? col.render(row) : (row[col.accessor || col.key || col.label] ?? "—")
				)
			);
	const visibleCols = columns
		.map((col: any, j: number) => ({ col, j }))
		.filter(({ j }) => isEmpty || cells.some((rowCells) => !isBlankCell(rowCells[j])));
	const toolbarNode =
		toolbar ??
		((title || subtitle || actions || extra) ? (
			<TableToolbar title={title} subtitle={subtitle} actions={actions}>
				{extra}
			</TableToolbar>
		) : null);

	const body = (
		<div className="max-h-[calc(100vh-220px)] min-h-[160px] overflow-x-auto overflow-y-auto">
			<table className={`data-table w-full table-auto ${textSize}`}>
				<thead className="sticky top-0 z-10">
					<tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] dark:border-slate-600 dark:bg-slate-900/90">
						{visibleCols.map(({ col, j }) => (
							<th key={j} className={`${cellPad} ${rowPad} text-left text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-400 uppercase`}>
								{col.header || col.label || col.key}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{isEmpty ? (
						<tr>
							<td colSpan={visibleCols.length} className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
								{emptyMessage ?? "No data"}
							</td>
						</tr>
					) : (
						data.map((row: any, i: number) => (
							<tr
								key={i}
								className={`data-table-row group ${rowMinH} ${rowClassName?.(row) ?? "bg-white dark:bg-slate-800"} hover:bg-blue-50/70 dark:hover:bg-slate-700/80 border-b border-slate-100/90 dark:border-slate-700/60 last:border-b-0`}
							>
								{visibleCols.map(({ col, j }) => {
									const content = cells[i][j];
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
	);

	if (embedded) return body;

	return (
		<div className="data-table-wrapper w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-slate-800">
			{toolbarNode ? (
				<div className="data-table-toolbar border-b border-blue-100/80 bg-white px-5 py-4 dark:border-slate-600 dark:bg-slate-800">
					{toolbarNode}
				</div>
			) : null}
			{body}
		</div>
	);
}

export default React.memo(Table);
