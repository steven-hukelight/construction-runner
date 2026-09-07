import { render, screen, waitFor } from "@testing-library/react";
import { DashboardContent } from "@/app/dashboard/components/DashboardContent";
import * as cookies from "@/lib/utils/cookies";
import * as fetchTableModule from "@/lib/supabase/fetchTable";

jest.mock("@/lib/utils/cookies", () => ({
  getCompanyIdFromClient: jest.fn(),
  getRoleFromClient: jest.fn(),
}));

jest.mock("@/lib/supabase/fetchTable", () => ({
  fetchTable: jest.fn(),
}));

const mockGetCompanyIdFromClient = cookies.getCompanyIdFromClient as jest.MockedFunction<
  typeof cookies.getCompanyIdFromClient
>;
const mockGetRoleFromClient = cookies.getRoleFromClient as jest.MockedFunction<
  typeof cookies.getRoleFromClient
>;
const mockFetchTable = fetchTableModule.fetchTable as jest.MockedFunction<
  typeof fetchTableModule.fetchTable
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DashboardContent", () => {
  it("renders correct company data when companyId is set", async () => {
    mockGetCompanyIdFromClient.mockReturnValue("co-a-uuid");
    mockGetRoleFromClient.mockReturnValue("admin");
    mockFetchTable.mockImplementation((table: string) => {
      const dataMap: Record<string, unknown[]> = {
        sites: [
          { id: "s1", name: "Site Alpha", company_id: "co-a", created_at: "2024-01-15T10:00:00Z" },
          { id: "s2", name: "Site Beta", company_id: "co-a", created_at: "2024-01-16T10:00:00Z" },
        ],
        rams: [{ id: "r1", title: "RAMS Doc", status: "APPROVED" }],
        users: [{ id: "u1", display_name: "Alice" }],
        tasks: [{ id: "t1", title: "Task 1" }],
      };
      return Promise.resolve({ data: dataMap[table] ?? [], error: null });
    });

    render(<DashboardContent {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchTable).toHaveBeenCalledWith("sites", "admin", "co-a-uuid");
    });

    expect(screen.getByText("Total Sites")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Site added: Site Alpha/)).toBeInTheDocument();
    });
    const siteCounts = screen.getAllByText("2");
    expect(siteCounts.length).toBeGreaterThan(0);
  });

  it("superuser sees all companies (fetchTable called without company filter)", async () => {
    mockGetCompanyIdFromClient.mockReturnValue(null);
    mockGetRoleFromClient.mockReturnValue("superuser");
    mockFetchTable.mockImplementation((table: string) =>
      Promise.resolve({
        data: table === "sites"
          ? [
              { id: "s1", name: "Site A", company_id: "co-a" },
              { id: "s2", name: "Site B", company_id: "co-b" },
            ]
          : [],
        error: null,
      })
    );

    render(<DashboardContent {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchTable).toHaveBeenCalledWith("sites", "superuser", null);
    });

    expect(screen.getByText("Total Sites")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("null companyId with non-superuser shows props-based data (no fetch)", async () => {
    mockGetCompanyIdFromClient.mockReturnValue(null);
    mockGetRoleFromClient.mockReturnValue("admin");

    render(
      <DashboardContent
        {...defaultProps}
        sites={[]}
        rams={[]}
        users={[]}
        tasks={[]}
        totalSites={0}
        totalUsers={0}
        totalTasks={0}
        activeRAMS={0}
      />
    );

    await waitFor(() => {
      expect(mockFetchTable).not.toHaveBeenCalled();
    });

    expect(screen.getByText("Total Sites")).toBeInTheDocument();
    const zeroCounts = screen.getAllByText("0");
    expect(zeroCounts.length).toBeGreaterThan(0);
    expect(screen.queryByText(/Site added:/)).not.toBeInTheDocument();
  });

  it("renders stat cards and quick actions", async () => {
    mockGetCompanyIdFromClient.mockReturnValue("co-a");
    mockGetRoleFromClient.mockReturnValue("admin");
    mockFetchTable.mockImplementation((table: string) =>
      Promise.resolve({
        data: table === "sites" ? defaultProps.sites : [],
        error: null,
      })
    );

    render(<DashboardContent {...defaultProps} />);

    expect(screen.getByText("Total Sites")).toBeInTheDocument();
    expect(screen.getByText("Active RAMS")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Add Site")).toBeInTheDocument();
    expect(screen.getByText("Upload RAMS")).toBeInTheDocument();
    expect(screen.getByText("Invite User")).toBeInTheDocument();
  });
});
