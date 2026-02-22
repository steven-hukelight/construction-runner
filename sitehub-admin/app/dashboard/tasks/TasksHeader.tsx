"use client";

import PageHeader from "../components/PageHeader";
import AddTaskModal from "./AddTaskModal";
import { getRoleFromClient } from "@/lib/utils/cookies";

const CAN_ADD_TASK_ROLES = ["superuser", "admin", "supervisor", "ADMIN", "SUPERVISOR"];

export default function TasksHeader() {
  const role = getRoleFromClient();
  const canAddTask = role && CAN_ADD_TASK_ROLES.includes(role);

  return (
    <PageHeader
      title="Tasks"
      description="Assign and track tasks across sites."
      action={canAddTask ? <AddTaskModal /> : undefined}
    />
  );
}
