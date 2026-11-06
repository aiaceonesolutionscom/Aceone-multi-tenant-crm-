import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin, handleApiError } from "@/lib/tenant-guard";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import { TenantStatus } from "@prisma/client";

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  status: z.nativeEnum(TenantStatus).optional(),
  timezone: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  enabledChannels: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();

    const validated = updateClientSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || "Validation error" },
        { status: 400 }
      );
    }

    const { name, contactPerson, phone, status, timezone, newPassword, enabledChannels } =
      validated.data;

    const existing = await prisma.tenant.findUnique({
      where: { id },
      include: { users: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Update tenant
      await tx.tenant.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(contactPerson && { contactPerson }),
          ...(phone !== undefined && { phone }),
          ...(status && { status }),
          ...(timezone && { timezone }),
          ...(enabledChannels && { enabledChannels }),
        },
      });

      // If phone number changed, reset WhatsApp session and unbind previous connection
      if (phone !== undefined && phone !== existing.phone) {
        try {
          await fetch(`http://localhost:3001/disconnect?tenantId=${id}`, { method: "POST" });
        } catch (_) {}

        await tx.ingestionSource.updateMany({
          where: { tenantId: id, type: "WHATSAPP" },
          data: {
            isActive: false,
            fieldMapping: {
              assignedPhone: phone,
              connectedPhone: null,
            },
          },
        });
      }

      // If status changed to INACTIVE, also disable user accounts
      if (status) {
        await tx.user.updateMany({
          where: { tenantId: id },
          data: { isActive: status === TenantStatus.ACTIVE },
        });
      }

      // If password reset requested
      if (newPassword && existing.users.length > 0) {
        const passwordHash = await hashPassword(newPassword);
        await tx.user.update({
          where: { id: existing.users[0].id },
          data: { passwordHash },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: id,
          userId: admin.id,
          action: "CLIENT_UPDATED",
          entityType: "Tenant",
          entityId: id,
          metadata: { updatedFields: Object.keys(validated.data) },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Client updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.tenant.findUnique({
      where: { id },
      include: { _count: { select: { leads: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete tenant (cascades to users, assignments, leads)
      await tx.tenant.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "CLIENT_DELETED",
          entityType: "Tenant",
          entityId: id,
          metadata: { companyName: existing.name, leadCount: existing._count.leads },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
