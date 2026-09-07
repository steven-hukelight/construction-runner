import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** PostgREST / Postgres messages when a table or column is absent in this deployment. */
function ignorableSchemaError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

function uuidTypeMismatchError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("invalid input syntax for type uuid");
}

/**
 * Remove rows that reference this site so `sites` delete does not hit FK violations.
 * Safe to call before deleting the site row; uses service role (bypasses RLS).
 */
export async function purgeSiteBeforeDelete(siteId: string): Promise<string | null> {
  const del = async (table: string, column = "site_id") => {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, siteId);
    if (error && ignorableSchemaError(error.message)) return null;
    if (error && uuidTypeMismatchError(error.message)) {
      return {
        message: `${table}: site_id is still UUID in the database while site ids are strings. Run pending Supabase migrations (e.g. 20260325140000_attendance_site_id_text.sql and 20260326100000_notices_message_threads_site_id_text.sql), then try again. Details: ${error.message}`,
      } as { message: string };
    }
    return error;
  };

  // Live + archived attendance (common FK: attendance_site_id_fkey)
  for (const table of ["attendance", "attendance_archive"] as const) {
    const err = await del(table);
    if (err) return `${table}: ${err.message}`;
  }

  const junctionAndSimple = [
    "assigned_operatives",
    "user_site_inductions",
    "site_subcontractors",
    "tasks",
    "notices",
    "deliveries",
    "assets",
    "near_miss",
    "invite_codes",
    "message_threads",
  ] as const;

  for (const table of junctionAndSimple) {
    const err = await del(table);
    if (err) return `${table}: ${err.message}`;
  }

  // Children cascade from these parent rows in schema migrations
  for (const table of ["rams", "briefings", "safety_alerts"] as const) {
    const err = await del(table);
    if (err) return `${table}: ${err.message}`;
  }

  return null;
}
