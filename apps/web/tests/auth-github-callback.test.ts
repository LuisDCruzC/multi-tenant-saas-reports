import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prismaTransaction: vi.fn(),
  provisionUserTenantSession: vi.fn(),
  createSessionCookie: vi.fn(),
  exchangeGithubCode: vi.fn(),
  fetchGithubProfile: vi.fn(),
  clearGithubOAuthStateCookie: vi.fn(),
}));

vi.mock("@saas/db", () => ({
  prisma: {
    $transaction: mocks.prismaTransaction,
  },
}));

vi.mock("@/lib/provision-session", () => ({
  provisionUserTenantSession: mocks.provisionUserTenantSession,
}));

vi.mock("@/lib/session", () => ({
  createSessionCookie: mocks.createSessionCookie,
}));

vi.mock("@/lib/github-oauth", () => ({
  exchangeGithubCode: mocks.exchangeGithubCode,
  fetchGithubProfile: mocks.fetchGithubProfile,
  clearGithubOAuthStateCookie: mocks.clearGithubOAuthStateCookie,
  githubOAuthStateCookieName: "saas_github_oauth_state",
}));

const { GET } = await import("@/app/api/auth/github/callback/route");

beforeEach(() => {
  process.env.GITHUB_CLIENT_ID = "github-client-id";
  process.env.GITHUB_CLIENT_SECRET = "github-client-secret";

  mocks.prismaTransaction.mockReset();
  mocks.provisionUserTenantSession.mockReset();
  mocks.createSessionCookie.mockReset();
  mocks.exchangeGithubCode.mockReset();
  mocks.fetchGithubProfile.mockReset();
  mocks.clearGithubOAuthStateCookie.mockReset();

  mocks.prismaTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    return callback({});
  });
  mocks.provisionUserTenantSession.mockResolvedValue({
    userId: "user-1",
    tenantId: "tenant-1",
    email: "ada@example.com",
    tenantSlug: "github-ada",
    tenantName: "Ada workspace",
  });
  mocks.createSessionCookie.mockReturnValue({
    name: "saas_session",
    value: "session-cookie",
    options: { path: "/", httpOnly: true, sameSite: "lax" as const, secure: false, maxAge: 3600 },
  });
  mocks.exchangeGithubCode.mockResolvedValue("github-access-token");
  mocks.fetchGithubProfile.mockResolvedValue({
    login: "ada",
    name: "Ada",
    email: "ada@example.com",
    tenantSlug: "github-ada",
    tenantName: "Ada workspace",
  });
  mocks.clearGithubOAuthStateCookie.mockReturnValue({
    name: "saas_github_oauth_state",
    value: "",
    options: { path: "/", httpOnly: true, sameSite: "lax" as const, secure: false, maxAge: 0 },
  });
});

describe("github auth callback route", () => {
  it("creates a session and redirects to the dashboard", async () => {
    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=oauth-code&state=state-123", {
        headers: {
          cookie: "saas_github_oauth_state=state-123",
        },
      }) as never,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
    expect(mocks.exchangeGithubCode).toHaveBeenCalledWith("http://localhost/api/auth/github/callback?code=oauth-code&state=state-123", "oauth-code");
    expect(mocks.fetchGithubProfile).toHaveBeenCalledWith("github-access-token");
    expect(mocks.provisionUserTenantSession).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        email: "ada@example.com",
        name: "Ada",
        tenantSlug: "github-ada",
        tenantName: "Ada workspace",
      }),
    );
    expect(mocks.createSessionCookie).toHaveBeenCalledWith({
      userId: "user-1",
      tenantId: "tenant-1",
      email: "ada@example.com",
      tenantSlug: "github-ada",
      tenantName: "Ada workspace",
    });
  });

  it("returns the user to login when the state is invalid", async () => {
    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=oauth-code&state=other-state", {
        headers: {
          cookie: "saas_github_oauth_state=state-123",
        },
      }) as never,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?error=invalid_github_state");
    expect(mocks.exchangeGithubCode).not.toHaveBeenCalled();
    expect(mocks.provisionUserTenantSession).not.toHaveBeenCalled();
  });

  it("returns the user to login when token exchange fails", async () => {
    mocks.exchangeGithubCode.mockRejectedValue(new Error("exchange failed"));

    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=oauth-code&state=state-123", {
        headers: {
          cookie: "saas_github_oauth_state=state-123",
        },
      }) as never,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?error=github_oauth_failed");
    expect(mocks.fetchGithubProfile).not.toHaveBeenCalled();
    expect(mocks.provisionUserTenantSession).not.toHaveBeenCalled();
  });

  it("returns the user to login when profile fetch fails", async () => {
    mocks.fetchGithubProfile.mockRejectedValue(new Error("profile failed"));

    const response = await GET(
      new Request("http://localhost/api/auth/github/callback?code=oauth-code&state=state-123", {
        headers: {
          cookie: "saas_github_oauth_state=state-123",
        },
      }) as never,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?error=github_oauth_failed");
    expect(mocks.provisionUserTenantSession).not.toHaveBeenCalled();
  });
});