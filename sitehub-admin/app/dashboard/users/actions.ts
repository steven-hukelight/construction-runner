"use server";

import { getServerRequestBaseUrl } from "@/lib/serverRequestBaseUrl";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function fetchUsers(companyId?: string, role?: string, cookieHeader?: string) {
  try {
    const base = await getServerRequestBaseUrl();
    let url = `${base}/api/users`;
    if (companyId) {
      url += `?companyId=${encodeURIComponent(companyId)}`;
    } else if (role === "superuser") {
      url += `?all=true`;
    }
    const headers: HeadersInit = {};
    const effectiveCookie = cookieHeader ?? (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (effectiveCookie) headers.Cookie = effectiveCookie;
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error("fetchUsers:", e);
    return [];
  }
}

export async function inviteUser(data: { name: string; email: string; role: string }) {
  const base = await getServerRequestBaseUrl();
  const url = `${base}/api/users`;
  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookieHeader && { Cookie: cookieHeader }) },
    body: JSON.stringify(data),
  });

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
      return { success: false, error: "Only admins can update user roles" };
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

    const { data: userRow } = await supabaseAdmin.from("users").select("company_id").eq("id", id).maybeSingle();
    if (!userRow) return { success: false, error: "User not found" };
    const targetCompanyId = String((userRow as { company_id?: string | null }).company_id ?? "").trim();
    if (roleLower !== "superuser" && companyId !== targetCompanyId) {
      return { success: false, error: "Cannot update user in another company" };
    }

    const updates = { role, updated_at: new Date().toISOString() };
    const { error } = await supabaseAdmin.from("users").update(updates).eq("id", id);
    if (error) {
      console.error("updateUserRole error:", error);
      return { success: false, error: (error as { message?: string }).message ?? "Failed to update role" };
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

export async function deleteUser(id: string) {
  const base = await getServerRequestBaseUrl();
  const url = `${base}/api/users/${id}`;
  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  await fetch(url, {
    method: "DELETE",
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });
}
