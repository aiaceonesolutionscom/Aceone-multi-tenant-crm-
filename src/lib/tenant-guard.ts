import { getCurrentUser, AuthenticatedUser } from "./session";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { logger } from "./logger";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Ensures the requester is authenticated as a SUPER_ADMIN.
 */
export async function requireSuperAdmin(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required", 401);
  }
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new AuthError("Access denied: Super Admin privileges required", 403);
  }
  return user;
}

export interface ClientContext {
  user: AuthenticatedUser;
  tenantId: string;
  portfolioId: string | null;
}

/**
 * Ensures the requester is authenticated as a CLIENT_ADMIN with an active tenant.
 * Returns the tenantId and assigned business portfolioId.
 */
export async function requireClientContext(): Promise<ClientContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required", 401);
  }
  if (!user.tenantId) {
    throw new AuthError("No tenant associated with this account", 403);
  }

  // Fetch tenant's assigned portfolio
  const assignment = await prisma.portfolioAssignment.findUnique({
    where: { tenantId: user.tenantId },
    select: { businessPortfolioId: true },
  });

  return {
    user,
    tenantId: user.tenantId,
    portfolioId: assignment?.businessPortfolioId ?? null,
  };
}

/**
 * Standard error response helper for API routes.
 */
export function handleApiError(error: unknown) {
  logger.error("API Route Execution Failure", error);
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
