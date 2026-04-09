import type { Prisma } from "@prisma/client";
import { prisma } from "@saas/db";
import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/session";
import { provisionUserTenantSession } from "@/lib/provision-session";
import {
  clearGithubOAuthStateCookie,
  exchangeGithubCode,
  fetchGithubProfile,
  githubOAuthStateCookieName,
} from "@/lib/github-oauth";

function getCookieValue(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${cookieName}=`));

  if (!cookie) {
    return null;
  }

  return cookie.slice(cookieName.length + 1) || null;
}

function redirectToLogin(requestUrl: string, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, requestUrl));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const cookieState = getCookieValue(request, githubOAuthStateCookieName);

  if (!code || !state) {
    return redirectToLogin(request.url, "missing_github_code");
  }

  if (!cookieState || cookieState !== state) {
    return redirectToLogin(request.url, "invalid_github_state");
  }

  try {
    const accessToken = await exchangeGithubCode(request.url, code);
    const profile = await fetchGithubProfile(accessToken);

    const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return provisionUserTenantSession(tx, {
        email: profile.email,
        name: profile.name ?? profile.login,
        tenantSlug: profile.tenantSlug,
        tenantName: profile.tenantName,
      });
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    const sessionCookie = createSessionCookie(session);
    const stateCookie = clearGithubOAuthStateCookie();

    response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
    response.cookies.set(stateCookie.name, stateCookie.value, stateCookie.options);

    return response;
  } catch {
    return redirectToLogin(request.url, "github_oauth_failed");
  }
}