import { NextResponse } from "next/server";
import {
  createGithubAuthorizeUrl,
  createGithubOAuthState,
  createGithubOAuthStateCookie,
} from "@/lib/github-oauth";

export async function GET(request: Request) {
  const state = createGithubOAuthState();
  const response = NextResponse.redirect(createGithubAuthorizeUrl(request.url, state));
  const cookie = createGithubOAuthStateCookie(state);

  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}