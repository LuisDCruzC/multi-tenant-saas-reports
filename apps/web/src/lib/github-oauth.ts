import { randomUUID } from "node:crypto";

export const githubOAuthStateCookieName = "saas_github_oauth_state";

function getGithubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Faltan GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET");
  }

  return { clientId, clientSecret };
}

function getRedirectUri(requestUrl: string) {
  return new URL("/api/auth/github/callback", requestUrl).toString();
}

function githubRequestHeaders(accessToken: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "multi-tenant-saas-reports",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function githubCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function sanitizeTenantSlug(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "github-user";
}

export function createGithubOAuthState() {
  return randomUUID();
}

export function createGithubOAuthStateCookie(state: string) {
  return {
    name: githubOAuthStateCookieName,
    value: state,
    options: githubCookieOptions(10 * 60),
  };
}

export function clearGithubOAuthStateCookie() {
  return {
    name: githubOAuthStateCookieName,
    value: "",
    options: githubCookieOptions(0),
  };
}

export function createGithubAuthorizeUrl(requestUrl: string, state: string) {
  const { clientId } = getGithubOAuthConfig();
  const redirectUri = getRedirectUri(requestUrl);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

async function readGithubJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`GitHub respondió ${response.status} en ${url}`);
  }

  return (await response.json()) as T;
}

export async function exchangeGithubCode(requestUrl: string, code: string) {
  const { clientId, clientSecret } = getGithubOAuthConfig();
  const redirectUri = getRedirectUri(requestUrl);
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`No se pudo intercambiar el código de GitHub (${response.status})`);
  }

  const payload = (await response.json()) as { access_token?: string; error?: string };

  if (!payload.access_token) {
    throw new Error(payload.error ?? "GitHub no devolvió access_token");
  }

  return payload.access_token;
}

type GithubUser = {
  login: string;
  name: string | null;
  email: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function fetchGithubProfile(accessToken: string) {
  const user = await readGithubJson<GithubUser>("https://api.github.com/user", {
    headers: githubRequestHeaders(accessToken),
  });
  const emails = await readGithubJson<GithubEmail[]>("https://api.github.com/user/emails", {
    headers: githubRequestHeaders(accessToken),
  });

  const email =
    emails.find((entry) => entry.primary && entry.verified)?.email ??
    emails.find((entry) => entry.verified)?.email ??
    user.email ??
    `${user.login}@users.noreply.github.com`;

  return {
    login: user.login,
    name: user.name,
    email,
    tenantSlug: `github-${sanitizeTenantSlug(user.login)}`,
    tenantName: `${user.name?.trim() || user.login} workspace`,
  };
}