import { render, screen, waitFor } from "@testing-library/react";
import { DashboardContent } from "@/app/dashboard/components/DashboardContent";
import * as cookies from "@/lib/utils/cookies";

jest.mock("@/lib/utils/cookies", () => ({
  getCompanyIdFromClient: jest.fn(),
  getRoleFromClient: jest.fn(),
  getCurrentSiteIdFromCookie: jest.fn(() => null),
}));

jest.mock("next/dynamic", () => () => {
  function MockCharts() {
    return <div>charts</div>;
  }
  return MockCharts;
});

const mockGetCompanyIdFromClient = cookies.getCompanyIdFromClient as jest.MockedFunction<
  typeof cookies.getCompanyIdFromClient
>;
const mockGetRoleFromClient = cookies.getRoleFromClient as jest.MockedFunction<
  typeof cookies.getRoleFromClient
>;

const defaultProps = {
  totalSites: 2,
  activeRAMS: 1,
  totalUsers: 3,
  totalTasks: 2,
  sites: [
    { id: "s1", name: "Site Alpha", company_id: "co-a", created_at: "2024-01-15T10:00:00Z" },
    { id: "s2", name: "Site Beta", company_id: "co-a", created_at: "2024-01-16T10:00:00Z" },
  ],
  rams: [{ id: "r1", title: "RAMS Doc", status: "APPROVED", company_id: "co-a" }],
  users: [
    { id: "u1", display_name: "Alice", company_id: "co-a" },
    { id: "u2", display_name: "Bob", company_id: "co-a" },
  ],
  tasks: [
    { id: "t1", title: "Task 1", company_id: "co-a" },
    { id: "t2", title: "Task 2", company_id: "co-a" },
  ],
};

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCompanyIdFromClient.mockReturnValue("co-a-uuid");
  mockGetRoleFromClient.mockReturnValue("admin");
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth/registrations")) return jsonResponse([]);
    if (url.includes("count=unreviewed")) return jsonResponse({ count: 0 });
    if (url.includes("/api/admin/missing-info")) return jsonResponse([{ userId: "u1" }, { userId: "u2" }]);
    if (url.includes("/api/assets")) {
      return jsonResponse([
        { id: "a1", next_inspection_due: "2020-01-01", inspection_required: true },
        { id: "a2", next_inspection_due: "2099-01-01", inspection_required: true },
      ]);
    }
    return jsonResponse([]);
  }) as jest.Mock;
});

describe("DashboardContent", () => {
  it("renders stats from props and latest activity", async () => {
    render(<DashboardContent {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(screen.getByText("Sites")).toBeInTheDocument();
    expect(screen.getByText("Approved RAMS")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Open tasks")).toBeInTheDocument();
    expect(screen.getByText(/Site set up: Site Alpha/)).toBeInTheDocument();
  });

  it("feeds overdue inspections and missing info into Needs attention", async () => {
    render(<DashboardContent {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("1 asset inspection overdue")).toBeInTheDocument();
    });
    expect(screen.getByText("2 people are missing emergency or medical info")).toBeInTheDocument();
  });

  it("shows empty attention state when nothing is waiting", async () => {
    (global.fetch as jest.Mock).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("count=unreviewed")) return jsonResponse({ count: 0 });
      return jsonResponse([]);
    });

    render(
      <DashboardContent
        {...defaultProps}
        tasks={[{ id: "t1", title: "Done", company_id: "co-a", status: "DONE" }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Nothing waiting/)).toBeInTheDocument();
    });
  });
});
