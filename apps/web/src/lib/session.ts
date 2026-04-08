import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

const sessionCookieName = "saas_session";

const sessionSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  email: z.string().email(),
  tenantSlug: z.string().min(1),
  tenantName: z.string().min(1),
});

export type SessionData = z.infer<typeof sessionSchema>;

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET ?? "dev-session-secret";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function serializeSession(session: SessionData) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = signValue(payload);

  return `${payload}.${signature}`;
}

export function parseSession(cookieValue: string | undefined | null): SessionData | null {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as unknown;
    return sessionSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function getSessionFromCookies() {
  return parseSession(cookies().get(sessionCookieName)?.value);
}

export function createSessionCookie(session: SessionData) {
  return {
    name: sessionCookieName,
    value: serializeSession(session),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export function clearSessionCookie() {
  return {
    name: sessionCookieName,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}
