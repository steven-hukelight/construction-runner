"use server";

import { cookies } from "next/headers";
import { callRoute, callRouteList } from "@/lib/server/callRoute";
import { GET as getUsers, POST as postUser } from "@/app/api/users/route";
import { DELETE as deleteUserRoute } from "@/app/api/users/[id]/route";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { canAssignSuperAdminRole, isCompanySuperAdmin, usesAssignedSites } from "@/lib/auth/roles";

export async function fetchUsers(companyId?: string, role?: string) {
  let path = "/api/users";
  if (companyId) {
    path += `?companyId=${encodeURIComponent(companyId)}`;
  } else if (role === "superuser") {
    path += `?all=true`;
  }
  return callRouteList(getUsers, path);
}

export async function inviteUser(data: { name: string; email: string; role: string; siteIds?: string[] }) {
  const res = await callRoute(postUser, "/api/users", { method: "POST", body: data });

  const user = await res.json();
  // No need to create a separate profile document; profile fields are in user doc
  return user;
}

export async function updateUserRole(id: string, role: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    const userRole = cookieStore.get("role")?.value;
    const roleLower = (userRole ?? "").toLowerCase();
    if (roleLower !== "admin" && roleLower !== "superuser" && roleLower !== "sub_admin") {
      return { success: false, error: "Only Super Admins can update user roles" };
    }

    let companyId = cookieStore.get("companyId")?.value?.trim();
    if (!companyId && roleLower !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role: userRole,
        })) || undefined;
    }

    const { data: userRow } = await supabaseAdmin.from("users").select("company_id, role").eq("id", id).maybeSingle();
    if (!userRow) return { success: false, error: "User not found" };
    const targetCompanyId = String((userRow as { company_id?: string | null }).company_id ?? "").trim();
    if (roleLower !== "superuser" && companyId !== targetCompanyId) {
      return { success: false, error: "Cannot update user in another company" };
    }

    const allowed = new Set(["admin", "site_admin", "supervisor", "operative", "sub_admin", "viewer"]);
    if (roleLower === "superuser") allowed.add("superuser");
    const nextRole = role.toLowerCase().trim();
    if (!allowed.has(nextRole)) {
      return { success: false, error: "Invalid role" };
    }

    const targetIsSuperAdmin = isCompanySuperAdmin((userRow as { role?: string }).role);
    if ((nextRole === "admin" || targetIsSuperAdmin) && !canAssignSuperAdminRole(userRole)) {
      return { success: false, error: "Only a Super Admin can assign or change Super Admin" };
    }

    const updates = { role: nextRole, updated_at: new Date().toISOString() };
    const { error } = await supabaseAdmin.from("users").update(updates).eq("id", id);
    if (error) {
      console.error("updateUserRole error:", error);
      return { success: false, error: (error as { message?: string }).message ?? "Failed to update role" };
    }

    if (!usesAssignedSites(nextRole)) {
      await supabaseAdmin.from("user_sites").delete().eq("user_id", id);
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/all-users");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update role";
    console.error("updateUserRole exception:", e);
    return { success: false, error: msg };
  }
}

export async function deleteUser(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const res = await callRoute(deleteUserRoute, `/api/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    params: { id },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { success: false, error: data.error || "Failed to delete user" };
  }
  return { success: true };
}
