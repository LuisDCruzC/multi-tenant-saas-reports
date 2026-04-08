import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  const cookie = clearSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
