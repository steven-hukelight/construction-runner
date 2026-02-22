/**
 * Stable mock data for deterministic snapshot tests.
 */

export const MOCK_THREADS = [
  { id: "t1", createdBy: "u1", createdAt: "2025-02-21T10:00:00Z", lastMessage: "Hello, when is the delivery?", lastAt: "2025-02-21T10:05:00Z", inThread: false },
  { id: "t2", createdBy: "u2", createdAt: "2025-02-20T14:00:00Z", lastMessage: "Safety briefing completed", lastAt: "2025-02-20T14:30:00Z", inThread: false },
];

export const MOCK_MESSAGES = [
  { id: "m1", senderId: "u1", sender_name: "John Smith", body: "Hello, when is the delivery?", attachmentUrl: null, createdAt: "2025-02-21T10:05:00Z" },
  { id: "m2", senderId: "u2", sender_name: "Jane Doe", body: "Expected by 3pm today.", attachmentUrl: null, createdAt: "2025-02-21T10:06:00Z" },
];

export const MOCK_ASSETS = [
  { id: "a1", name: "Safety Helmet #42", type: "PPE", serial_number: "SH-2024-001", status: "active", site_id: "s1" },
  { id: "a2", name: "High-Vis Vest", type: "PPE", serial_number: null, status: "active", site_id: "s1" },
];

export const MOCK_DELIVERIES = [
  { id: "d1", reference: "REF-12345", site: "Main Site", site_id: "s1", status: "PENDING", scheduled_at: "2025-02-21T14:00:00Z", created_at: "2025-02-21T09:00:00Z" },
  { id: "d2", reference: "REF-12346", site: "Building B", site_id: "s2", status: "DELIVERED", scheduled_at: "2025-02-20T10:00:00Z", created_at: "2025-02-20T08:00:00Z" },
];

export const MOCK_TASKS = [
  { id: "tk1", title: "Complete safety briefing", description: "Ensure all operatives have signed", status: "OPEN", company_id: "c1", site_id: "s1", assigned_to: "u1", created_at: "2025-02-21T08:00:00Z" },
  { id: "tk2", title: "Inspect scaffolding", description: "", status: "DONE", company_id: "c1", site_id: "s1", assigned_to: null, created_at: "2025-02-20T16:00:00Z" },
];

export const MOCK_RAMS = [
  { id: "r1", title: "Excavation RAMS", siteId: "s1", companyId: "c1", status: "APPROVED", version: "1.0", created_at: "2025-02-21T09:00:00Z" },
  { id: "r2", title: "Working at Height RAMS", siteId: "s2", companyId: "c1", status: "PENDING", version: "2.1", created_at: "2025-02-20T14:00:00Z" },
];

export const MOCK_PRE_INDUCTION_SECTIONS = [
  { section: "personal", fullName: "John Smith", email: "john@example.com", status: "Complete" },
  { section: "competencyCard", cardType: "CSCS", cardNumber: "123456", status: "Complete" },
  { section: "certifications", certifications: [], status: "Complete" },
  { section: "declarations", status: "Pending" },
];
