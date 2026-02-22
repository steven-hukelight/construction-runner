/**
 * Web UI snapshot tests – deterministic rendering with stable mock data.
 * Run: npm test -- tests/snapshots/web.snapshot.test.tsx
 * Update: npm run update-snapshots
 */
import React from "react";
import { render } from "@testing-library/react";
import {
  MessagingThreadList,
  MessagingMessageList,
  AssetTableRows,
  DeliveryTableRows,
  TaskTableRows,
  PreInductionAdminView,
  RAMSList,
} from "./SnapshotComponents";
import {
  MOCK_THREADS,
  MOCK_MESSAGES,
  MOCK_ASSETS,
  MOCK_DELIVERIES,
  MOCK_TASKS,
  MOCK_RAMS,
  MOCK_PRE_INDUCTION_SECTIONS,
} from "./mockData";

describe("Web snapshot tests", () => {
  beforeEach(() => {
    // Deterministic date formatting
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-02-21T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("MessagingThreadList matches snapshot", () => {
    const { container } = render(
      <MessagingThreadList threads={MOCK_THREADS} selectedId="t1" />
    );
    expect(container).toMatchSnapshot();
  });

  it("MessagingMessageList matches snapshot", () => {
    const { container } = render(
      <MessagingMessageList messages={MOCK_MESSAGES} />
    );
    expect(container).toMatchSnapshot();
  });

  it("AssetTableRows matches snapshot", () => {
    const { container } = render(
      <AssetTableRows assets={MOCK_ASSETS} />
    );
    expect(container).toMatchSnapshot();
  });

  it("DeliveryTableRows matches snapshot", () => {
    const { container } = render(
      <DeliveryTableRows deliveries={MOCK_DELIVERIES} />
    );
    expect(container).toMatchSnapshot();
  });

  it("TaskTableRows matches snapshot", () => {
    const { container } = render(
      <TaskTableRows tasks={MOCK_TASKS} />
    );
    expect(container).toMatchSnapshot();
  });

  it("PreInductionAdminView matches snapshot", () => {
    const sections = MOCK_PRE_INDUCTION_SECTIONS.map((s) => ({
      section: s.section,
      status: s.status,
    }));
    const { container } = render(
      <PreInductionAdminView sections={sections} />
    );
    expect(container).toMatchSnapshot();
  });

  it("RAMSList matches snapshot", () => {
    const { container } = render(
      <RAMSList rams={MOCK_RAMS} />
    );
    expect(container).toMatchSnapshot();
  });
});
