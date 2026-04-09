import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  randomUUID: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();

  return {
    ...actual,
    randomUUID: mocks.randomUUID,
  };
});

const { GET } = await import("@/app/api/auth/github/start/route");

beforeEach(() => {
  process.env.GITHUB_CLIENT_ID = "github-client-id";
  process.env.GITHUB_CLIENT_SECRET = "github-client-secret";
  mocks.randomUUID.mockReturnValue("state-123");
});

describe("github auth start route", () => {
  it("redirects to GitHub and sets the OAuth state cookie", async () => {
    const response = await GET(new Request("http://localhost/api/auth/github/start") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("https://github.com/login/oauth/authorize");
    expect(response.headers.get("location")).toContain("client_id=github-client-id");
    expect(response.headers.get("location")).toContain("scope=read%3Auser+user%3Aemail");
    expect(response.headers.get("location")).toContain("state=state-123");
    expect(response.headers.get("set-cookie")).toContain("saas_github_oauth_state=state-123");
  });
});