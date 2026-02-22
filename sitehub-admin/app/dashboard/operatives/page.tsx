"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Link from "next/link";
import { fetchUsers } from "../users/actions";
import Table from "../components/ui/Table";
import { supabase } from "@/supabase/auth/client";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

export default function OperativesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  // Real-time listener for operatives (users with companyId)
  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    if (!companyId) return;

    const loadOperatives = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (!error && data) setUsers(data);
    };

    loadOperatives();

    const channel = supabase
      .channel("operatives-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `company_id=eq.${companyId}` }, loadOperatives)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Operatives" description="Manage operative profiles and medical records." />
        <div className="card p-6 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Operatives" description="Manage operative profiles and medical records." />

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100">
            <UserCog className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Operatives</h3>
            <p className="text-sm text-slate-600">{users.length} operatives registered</p>
          </div>
        </div>
        <Table
          columns={[
            { header: "Name", accessor: "name" },
            { header: "Email", accessor: "email" },
            { header: "Role", accessor: "role" },
            {
              header: "Actions",
              accessor: "actions",
              render: (row: any) => (
                <Link
                  href={`/dashboard/operatives/${row.id}`}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 underline"
                >
                  View Profile
                </Link>
              ),
            },
          ]}
          data={users}
          density="comfortable"
        />
      </div>
    </div>
  );
}
