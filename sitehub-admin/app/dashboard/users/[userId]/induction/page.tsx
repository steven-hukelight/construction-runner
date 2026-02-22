import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { getInductionData } from "./server";
import InductionSummaryCard from "./components/InductionSummaryCard";
import InductionTable from "./components/InductionTable";

export default async function InductionProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;

  const data = await getInductionData(params.userId, { role, companyId });

  if (!data.user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Induction profile"
          description="User not found or you don’t have access."
        />
        <p className="text-gray-600">User not found or access denied.</p>
        <Link
          href="/dashboard/users"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Induction profile"
        description={`Induction history for ${data.user.name ?? data.user.email ?? data.user.id}.`}
        action={
          <Link
            href={`/dashboard/users/${params.userId}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← User profile
          </Link>
        }
      />
      <InductionSummaryCard user={data.user} summary={data.summary} />
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Site inductions</h3>
        {data.rows.length === 0 ? (
          <p className="text-gray-500 py-6 rounded-xl border border-gray-200 bg-white">
            No induction records yet.
          </p>
        ) : (
          <InductionTable userId={params.userId} rows={data.rows} />
        )}
      </section>
    </div>
  );
}
