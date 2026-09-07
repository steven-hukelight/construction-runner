import PageHeader from "../components/PageHeader";
import AttendanceTabs from "./AttendanceTabs";

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Live sign-in logs and role call."
      />

      <AttendanceTabs />
    </div>
  );
}
