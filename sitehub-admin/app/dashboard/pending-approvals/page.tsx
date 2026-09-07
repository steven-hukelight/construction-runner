import PageHeader from "../components/PageHeader";
import PendingApprovalsClient from "./PendingApprovalsClient";

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending approvals"
        description="Approve or reject users who have registered. Until approved, they cannot sign in to the web admin or mobile app."
      />
      <PendingApprovalsClient />
    </div>
  );
}
