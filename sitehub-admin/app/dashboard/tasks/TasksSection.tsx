"use client";

import { useState, useCallback } from "react";
import TasksTable from "./TasksTable";
import TasksHeader from "./TasksHeader";

export default function TasksSection({ data }: { data: unknown[] }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const onTaskCreated = useCallback(() => setRefreshTrigger((t) => t + 1), []);

  return (
    <div className="relative space-y-5">
      <div className="absolute top-24 left-40 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-teal-400/10 rounded-full blur-3xl -z-10" />
      <TasksHeader onTaskCreated={onTaskCreated} />
      <TasksTable data={data} refreshTrigger={refreshTrigger} />
    </div>
  );
}
