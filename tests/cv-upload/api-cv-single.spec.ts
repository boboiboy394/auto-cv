import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getServerUserId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/storage", () => ({
  deleteCVFile: vi.fn(),
}));

describe("GET /api/cv/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    vi.mocked(getServerUserId).mockResolvedValue(null);

    const { GET } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/cv-abc");
    const res = await GET(req, { params: Promise.resolve({ id: "cv-abc" }) });
    expect(res.status).toBe(401);
  });

  it("returns CV when found and owned by user", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    vi.mocked(getServerUserId).mockResolvedValue("user_123");

    const mockCV = {
      id: "cv-abc",
      user_id: "user_123",
      original_name: "resume.pdf",
      storage_path: "cvs/user_123/cv-abc/resume.pdf",
      parsed_text: "Nguyễn Văn A",
      structured_data: null,
      parse_confidence: null,
      warnings: [],
      created_at: "2026-03-28",
    };

    vi.mocked(createSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockCV, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createSupabaseAdmin>);

    const { GET } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/cv-abc");
    const res = await GET(req, { params: Promise.resolve({ id: "cv-abc" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("cv-abc");
  });

  it("returns 404 when CV not found", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    vi.mocked(getServerUserId).mockResolvedValue("user_123");

    vi.mocked(createSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createSupabaseAdmin>);

    const { GET } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/cv/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    vi.mocked(getServerUserId).mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/cv-abc", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "cv-abc" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when CV not found", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    vi.mocked(getServerUserId).mockResolvedValue("user_123");

    vi.mocked(createSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createSupabaseAdmin>);

    const { DELETE } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/nonexistent", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("deletes CV and returns success", async () => {
    const { getServerUserId } = await import("@/lib/auth");
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const { deleteCVFile } = await import("@/lib/supabase/storage");
    vi.mocked(getServerUserId).mockResolvedValue("user_123");
    vi.mocked(deleteCVFile).mockResolvedValue(undefined);

    const mockCV = { storage_path: "cvs/user_123/cv-abc/resume.pdf" };
    // delete().eq("id").eq("user_id") chain
    const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
    const deleteEq1 = vi.fn().mockReturnValue({ eq: deleteEq2 });
    const deleteChain = vi.fn().mockReturnValue({ eq: deleteEq1 });

    vi.mocked(createSupabaseAdmin).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockCV, error: null }),
            }),
          }),
        }),
        delete: deleteChain,
      }),
    } as unknown as ReturnType<typeof createSupabaseAdmin>);

    const { DELETE } = await import("@/app/api/cv/[id]/route");
    const req = new Request("http://localhost/api/cv/cv-abc", { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: "cv-abc" }) });
    expect(res.status).toBe(200);
    expect(deleteCVFile).toHaveBeenCalledWith("cvs/user_123/cv-abc/resume.pdf");
  });
});
