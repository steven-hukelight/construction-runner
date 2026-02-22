import PageHeader from "../components/PageHeader";

export default function OperativeDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operative Dashboard"
        description="Access your work tools and information here."
      />
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
        <p>Welcome. Use the menu to navigate.</p>
      </div>
    </div>
  );
}
