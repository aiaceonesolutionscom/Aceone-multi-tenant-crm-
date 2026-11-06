import { NextResponse } from "next/server";
import { getCurrentUser, destroySession } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    logger.audit("User Signed Out", {
      userId: user.id,
      tenantId: user.tenantId ?? undefined,
      details: { email: user.email },
    });
  }
  await destroySession();
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
