import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import { UserRole, TenantStatus } from "@prisma/client";

const createClientSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  companyEmail: z.string().email("Valid company email is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  loginEmail: z.string().email("Valid login email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  status: z.nativeEnum(TenantStatus).default(TenantStatus.ACTIVE),
  timezone: z.string().default("Asia/Karachi"),
  assignedPortfolioId: z.string().optional().nullable(),
  enabledChannels: z.array(z.string()).default(["WHATSAPP", "GOOGLE_SHEETS"]),
});

export async function GET() {
  try {
    await requireSuperAdmin();

    const clients = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        portfolioAssignment: {
          include: {
            businessPortfolio: {
              select: {
                id: true,
                name: true,
                metaBusinessId: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            leads: true,
            followUps: true,
          },
        },
      },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const validated = createClientSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Check if company email, login email, or username already exists
    const existingEmail = await prisma.tenant.findUnique({
      where: { companyEmail: data.companyEmail.toLowerCase().trim() },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "A client company with this email already exists" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.loginEmail.toLowerCase().trim() },
          { username: data.username.toLowerCase().trim() },
        ],
      },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Login email or username is already taken" },
        { status: 400 }
      );
    }

    // Check portfolio uniqueness if provided
    if (data.assignedPortfolioId) {
      const existingAssignment = await prisma.portfolioAssignment.findUnique({
        where: { businessPortfolioId: data.assignedPortfolioId },
        include: { tenant: { select: { name: true } } },
      });
      if (existingAssignment) {
        return NextResponse.json(
          {
            error: `Portfolio is already assigned to "${existingAssignment.tenant.name}". Reassigning must be done through Portfolio Management.`,
          },
          { status: 400 }
        );
      }
    }

    const passwordHash = await hashPassword(data.password);

    // Create Tenant + Client Admin User in a transaction
    const newTenant = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          companyEmail: data.companyEmail.toLowerCase().trim(),
          contactPerson: data.contactPerson,
          phone: data.phone || null,
          status: data.status,
          timezone: data.timezone,
          enabledChannels: data.enabledChannels?.length
            ? data.enabledChannels
            : ["WHATSAPP", "GOOGLE_SHEETS"],
        },
      });

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: data.contactPerson,
          email: data.loginEmail.toLowerCase().trim(),
          username: data.username.toLowerCase().trim(),
          passwordHash,
          role: UserRole.CLIENT_ADMIN,
          isActive: data.status === TenantStatus.ACTIVE,
        },
      });

      if (data.assignedPortfolioId) {
        await tx.portfolioAssignment.create({
          data: {
            tenantId: tenant.id,
            businessPortfolioId: data.assignedPortfolioId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: admin.id,
          action: "CLIENT_CREATED",
          entityType: "Tenant",
          entityId: tenant.id,
          metadata: { company: data.name, email: data.companyEmail },
        },
      });

      return tenant;
    });

    return NextResponse.json({
      success: true,
      client: newTenant,
      message: "Client created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
