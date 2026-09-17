"use client";

import PageHeader from "../components/PageHeader";
import AddTaskModal from "./AddTaskModal";
import { useClientSession } from "../components/ClientSessionProvider";

const CAN_ADD_TASK_ROLES = ["superuser", "admin", "site_admin", "supervisor", "ADMIN", "SUPERVISOR"];

export default function TasksHeader({ onTaskCreated }: { onTaskCreated?: () => void }) {
  const { role } = useClientSession();
  const canAddTask = role && CAN_ADD_TASK_ROLES.includes(role);

  return (
    <PageHeader
      title="Tasks"
      description="Assign and track tasks per site."
      compact
      action={canAddTask ? <AddTaskModal onSuccess={onTaskCreated} /> : undefined}
    />
  );
}
