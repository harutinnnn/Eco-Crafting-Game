import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db/client";
import { initializePlayerState } from "./db/seed";
import { sessions, users } from "./db/schema";

interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    isAdmin?: boolean;
  }
}

const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? "eco_session";
const stateCookieName = "eco_google_state";
const sessionDays = 14;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const parseCookies = (cookieHeader: string | undefined) =>
  Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [key, ...value] = cookie.split("=");
        return [decodeURIComponent(key), decodeURIComponent(value.join("="))];
      })
  );

const cookieOptions = (maxAgeSeconds: number) => [
  "HttpOnly",
  "Path=/",
  "SameSite=Lax",
  `Max-Age=${maxAgeSeconds}`,
  process.env.NODE_ENV === "production" ? "Secure" : ""
]
  .filter(Boolean)
  .join("; ");

const setCookie = (response: Response, name: string, value: string, maxAgeSeconds: number) => {
  response.append("Set-Cookie", `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${cookieOptions(maxAgeSeconds)}`);
};

const clearCookie = (response: Response, name: string) => {
  response.append("Set-Cookie", `${encodeURIComponent(name)}=; ${cookieOptions(0)}`);
};

const frontendOrigin = () => process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const createSession = async (userId: string, response: Response) => {
  const sessionToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(sessionToken),
    expiresAt
  });

  setCookie(response, sessionCookieName, sessionToken, sessionDays * 24 * 60 * 60);
};

const googleConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${process.env.BACKEND_PUBLIC_URL ?? "http://localhost:4000"}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google login requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/backend/.env.");
  }

  return { clientId, clientSecret, redirectUri };
};

export const redirectToGoogle = (_request: Request, response: Response) => {
  let config: ReturnType<typeof googleConfig>;
  try {
    config = googleConfig();
  } catch {
    response.redirect(`${frontendOrigin()}?auth=missing_google_config`);
    return;
  }

  const { clientId, redirectUri } = config;
  const state = crypto.randomBytes(24).toString("hex");
  setCookie(response, stateCookieName, state, 10 * 60);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  response.redirect(url.toString());
};

export const handleGoogleCallback = async (request: Request, response: Response) => {
  let config: ReturnType<typeof googleConfig>;
  try {
    config = googleConfig();
  } catch {
    response.redirect(`${frontendOrigin()}?auth=missing_google_config`);
    return;
  }

  const { clientId, clientSecret, redirectUri } = config;
  const cookies = parseCookies(request.headers.cookie);
  const code = typeof request.query.code === "string" ? request.query.code : "";
  const state = typeof request.query.state === "string" ? request.query.state : "";

  if (!code || !state || cookies[stateCookieName] !== state) {
    response.redirect(`${frontendOrigin()}?auth=failed`);
    return;
  }

  clearCookie(response, stateCookieName);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    response.redirect(`${frontendOrigin()}?auth=failed`);
    return;
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    response.redirect(`${frontendOrigin()}?auth=failed`);
    return;
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  });
  if (!profileResponse.ok) {
    response.redirect(`${frontendOrigin()}?auth=failed`);
    return;
  }

  const googleProfile = (await profileResponse.json()) as GoogleProfile;
  const username = googleProfile.name || googleProfile.email.split("@")[0] || "Player";
  const [user] = await db
    .insert(users)
    .values({
      username,
      email: googleProfile.email,
      googleId: googleProfile.sub,
      avatarUrl: googleProfile.picture ?? null,
      isAdmin: (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim()).includes(googleProfile.email)
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: {
        username,
        email: googleProfile.email,
        avatarUrl: googleProfile.picture ?? null,
        isAdmin: (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim()).includes(googleProfile.email)
      }
    })
    .returning();

  await initializePlayerState(user.id);

  await createSession(user.id, response);
  response.redirect(frontendOrigin());
};

export const fakeLogin = async (_request: Request, response: Response) => {
  const [user] = await db
    .insert(users)
    .values({
      username: "Demo Farmer",
      email: "demo@eco-crafting.local",
      googleId: "fake-demo-user",
      avatarUrl: null,
      isAdmin: true
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: {
        username: "Demo Farmer",
        email: "demo@eco-crafting.local",
        avatarUrl: null,
        isAdmin: true
      }
    })
    .returning();

  await initializePlayerState(user.id);
  await createSession(user.id, response);
  response.redirect(frontendOrigin());
};

export const getSessionUser = async (request: Request) => {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[sessionCookieName];
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())));
  if (!session) return null;

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) return null;

  return user;
};

export const requireAuth = async (request: Request, response: Response, next: NextFunction) => {
  const user = await getSessionUser(request);
  if (!user) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  request.userId = user.id;
  request.isAdmin = user.isAdmin;
  next();
};

export const requireAdmin = async (request: Request, response: Response, next: NextFunction) => {
  const user = await getSessionUser(request);
  if (!user) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!user.isAdmin) {
    response.status(403).json({ error: "Admin access required." });
    return;
  }
  request.userId = user.id;
  request.isAdmin = true;
  next();
};

export const logout = async (request: Request, response: Response) => {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[sessionCookieName];
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  clearCookie(response, sessionCookieName);
  response.json({ ok: true });
};
