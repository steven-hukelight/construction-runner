"use client";

import { useState, useCallback } from "react";
import TasksTable from "./TasksTable";
import TasksHeader from "./TasksHeader";

export default function TasksSection({ data }: { data: unknown[] }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const onTaskCreated = useCallback(() => setRefreshTrigger((t) => t + 1), []);

  return (
    <div className="relative space-y-5">
      <TasksHeader onTaskCreated={onTaskCreated} />
      <TasksTable data={data} refreshTrigger={refreshTrigger} />
    </div>
  );
}
