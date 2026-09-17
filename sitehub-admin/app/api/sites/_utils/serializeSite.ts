/** Normalize a `sites` row for admin + mobile (camelCase aliases + snake_case). */
export function serializeSite(row: Record<string, unknown> | null | undefined) {
  if (!row || typeof row !== "object") return row;
  const showOnMap = row.show_on_map ?? row.showOnMap ?? true;
  return {
    ...row,
    id: row.id,
    showOnMap: showOnMap !== false,
    show_on_map: showOnMap !== false,
    managerId: row.manager_id ?? row.managerId ?? null,
    companyId: row.company_id ?? row.companyId ?? null,
    inductionRequired: !!(row.induction_required ?? row.inductionRequired),
    mainContractorId: row.main_contractor_id ?? row.mainContractorId ?? null,
  };
}

export function serializeSites(rows: unknown) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => serializeSite(r as Record<string, unknown>));
}
