/** @jest-environment node */
const mockCreateSignedUploadUrl = jest.fn();
const mockList = jest.fn();
const mockMove = jest.fn();
const mockRemove = jest.fn();
const mockFrom = jest.fn((bucket: string) => {
  void bucket;
  return {
    createSignedUploadUrl: mockCreateSignedUploadUrl,
    list: mockList,
    move: mockMove,
    remove: mockRemove,
  };
});

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { storage: { from: (bucket: string) => mockFrom(bucket) } },
}));

import { claimStagedUpload, startStagedUpload } from "../storage/stagedUpload";

const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
  jest.clearAllMocks();
  mockCreateSignedUploadUrl.mockResolvedValue({ data: { signedUrl: "https://storage/upload?token=x" }, error: null });
  mockMove.mockResolvedValue({ error: null });
  mockRemove.mockResolvedValue({ error: null });
});
afterAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

async function start(kind: "rams" | "briefing" = "rams", size = 1000) {
  const started = await startStagedUpload(kind, "My RAMS (v2).pdf", size);
  if ("error" in started) throw new Error(started.error);
  const stagedPath = mockCreateSignedUploadUrl.mock.calls[0][0] as string;
  return { ...started, stagedPath };
}

describe("staged uploads", () => {
  it("issues an upload URL in the bucket's incoming folder", async () => {
    const { uploadUrl, stagedPath } = await start();
    expect(uploadUrl).toBe("https://storage/upload?token=x");
    expect(mockFrom).toHaveBeenCalledWith("rams");
    expect(stagedPath).toMatch(/^incoming\/[0-9a-f-]{36}\/My_RAMS__v2_.pdf$/);
  });

  it("refuses empty or oversized files before issuing a URL", async () => {
    expect(await startStagedUpload("rams", "a.pdf", 0)).toMatchObject({ status: 400 });
    expect(await startStagedUpload("rams", "a.pdf", 51 * 1024 * 1024)).toMatchObject({ status: 400 });
    expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("moves the staged file to the final path", async () => {
    const { token, stagedPath } = await start();
    const fileName = stagedPath.split("/").pop();
    mockList.mockResolvedValue({ data: [{ name: fileName, metadata: { size: 1000, mimetype: "application/pdf" } }] });

    const claimed = await claimStagedUpload("rams", token, "rams/site-1/final.pdf");
    expect(claimed).toEqual({ path: "rams/site-1/final.pdf", fileName, size: 1000, contentType: "application/pdf" });
    expect(mockMove).toHaveBeenCalledWith(stagedPath, "rams/site-1/final.pdf");
  });

  it("rejects a token for another kind, a tampered token, or an expired one", async () => {
    const { token } = await start("briefing");
    expect(await claimStagedUpload("rams", token, "x")).toEqual({ error: "Upload expired. Try again." });

    const [payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), p: "rams/other-company/file.pdf" }),
    ).toString("base64url");
    expect(await claimStagedUpload("briefing", `${forged}.${signature}`, "x")).toEqual({ error: "Upload expired. Try again." });

    const spy = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
    expect(await claimStagedUpload("briefing", token, "x")).toEqual({ error: "Upload expired. Try again." });
    spy.mockRestore();
    expect(mockMove).not.toHaveBeenCalled();
  });

  it("deletes a staged file that turned out larger than allowed", async () => {
    const { token, stagedPath } = await start();
    mockList.mockResolvedValue({ data: [{ name: stagedPath.split("/").pop(), metadata: { size: 60 * 1024 * 1024 } }] });
    expect(await claimStagedUpload("rams", token, "x")).toEqual({ error: "File too large (max 50 MB)" });
    expect(mockRemove).toHaveBeenCalledWith([stagedPath]);
    expect(mockMove).not.toHaveBeenCalled();
  });

  it("reports a missing upload", async () => {
    const { token } = await start();
    mockList.mockResolvedValue({ data: [] });
    expect(await claimStagedUpload("rams", token, "x")).toEqual({ error: "Upload not found. Try again." });
  });
});
