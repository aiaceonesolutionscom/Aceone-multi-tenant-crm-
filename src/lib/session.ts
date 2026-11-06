import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "aceone_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    companyEmail: string;
    timezone: string;
    status: string;
    enabledChannels?: string[];
  } | null;
}

/**
 * Creates a server-side session in PostgreSQL and sets an HTTP-only cookie.
 */
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return token;
}

/**
 * Validates the current HTTP-only cookie session and retrieves the authenticated user and tenant.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                companyEmail: true,
                timezone: true,
                status: true,
                enabledChannels: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    // Check if user is active
    if (!session.user.isActive) {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      username: session.user.username,
      role: session.user.role,
      tenantId: session.user.tenantId,
      tenant: session.user.tenant,
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * Clears the session from the database and removes the cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await prisma.session.delete({ where: { token } }).catch(() => {});
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error("destroySession error:", error);
  }
}
