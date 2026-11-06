import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { logger } from "@/lib/logger";

// OWASP ASVS V2.1: Strict validation bounds to prevent ReDoS and memory exhaustion
const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required").max(255, "Identifier is too long"),
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});

// OWASP ASVS V6.3: Rate Limiting & Anti-Brute-Force defense
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const loginRateLimitMap = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

function checkRateLimit(key: string): { blocked: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = loginRateLimitMap.get(key);

  if (!record) return { blocked: false };

  if (record.blockedUntil && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { blocked: true, remainingSeconds };
  }

  // Reset if window expired
  if (now - record.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    loginRateLimitMap.delete(key);
    return { blocked: false };
  }

  return { blocked: false };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = loginRateLimitMap.get(key) || { attempts: 0, firstAttemptAt: now };

  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
  }
  loginRateLimitMap.set(key, record);
}

function clearRateLimit(key: string) {
  loginRateLimitMap.delete(key);
}

// OWASP ASVS V6.2.2: Constant-time Bcrypt verification against timing attacks / username enumeration
const DUMMY_BCRYPT_HASH = "$2a$12$6sZk4qj9N8oVkWn7U5dDe9eO0L5K3P1Q7R2T4V6X8Y0Z1A3C5E7Ga";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const body = await req.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { identifier, password } = validated.data;
    const rateLimitKey = `${ip}_${identifier.toLowerCase()}`;

    // 1. Rate Limit Enforcement
    const rateLimitCheck = checkRateLimit(rateLimitKey);
    if (rateLimitCheck.blocked) {
      const minutes = Math.ceil((rateLimitCheck.remainingSeconds || 900) / 60);
      logger.security("Rate Limit Exceeded on Login", { identifier, ip, remainingMinutes: minutes });
      return NextResponse.json(
        {
          error: `Too many failed attempts. For your security, this account is temporarily locked. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        { status: 429 }
      );
    }

    // 2. Auto-initialize Super Admin if database has zero users
    const userCount = await prisma.user.count().catch(() => 0);
    if (userCount === 0 && identifier.toLowerCase() === "admin@aceone.com") {
      const defaultPasswordHash = await bcrypt.hash("Password@123", 12);
      await prisma.user.create({
        data: {
          name: "AceOne Super Admin",
          email: "admin@aceone.com",
          username: "superadmin",
          passwordHash: defaultPasswordHash,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        },
      });
      logger.info("Auto-initialized initial Super Admin user: admin@aceone.com");
    }

    // Query user by email OR username (case-insensitive for email)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
      include: {
        tenant: true,
      },
    });

    // 3. User verification & timing attack mitigation
    if (!user) {
      // Execute dummy bcrypt comparison so response time does not reveal user existence
      await verifyPassword(password, DUMMY_BCRYPT_HASH);
      recordFailedAttempt(rateLimitKey);
      logger.security("Failed Login Attempt - User Not Found", { identifier, ip });
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      logger.security("Login Attempt on Deactivated Account", { userId: user.id, email: user.email, ip });
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact AceOne administration." },
        { status: 403 }
      );
    }

    // 4. Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      recordFailedAttempt(rateLimitKey);
      logger.security("Failed Login Attempt - Invalid Password", { userId: user.id, email: user.email, ip });
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    // 5. Tenant Status check for Client Admins
    if (user.role === UserRole.CLIENT_ADMIN) {
      if (!user.tenant || user.tenant.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Your company workspace is currently inactive. Please contact AceOne administration." },
          { status: 403 }
        );
      }
    }

    // Login successful: Clear failed attempt counter
    clearRateLimit(rateLimitKey);

    // 6. Create secure HTTP-only session in database
    await createSession(user.id, ip, userAgent);

    // 7. Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const redirectUrl = user.role === UserRole.SUPER_ADMIN ? "/admin" : "/dashboard";

    logger.audit("User Successfully Signed In", {
      userId: user.id,
      tenantId: user.tenantId ?? undefined,
      details: { email: user.email, role: user.role, ip },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name || null,
      },
      redirectUrl,
    });
  } catch (error: any) {
    console.error("Login security error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected authentication error occurred" },
      { status: 500 }
    );
  }
}
