import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MetaService } from "@/services/meta.service";
import { encryptToken } from "@/lib/crypto";
import { MetaSyncStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/meta?error=${encodeURIComponent(
        errorDescription || error || "OAuth authorization was canceled"
      )}`
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/admin/meta/oauth/callback`;
    const tokenData = await MetaService.exchangeCodeForLongLivedToken(code, redirectUri);

    const expiresAt = new Date(Date.now() + tokenData.expiresInSeconds * 1000);
    const encryptedToken = encryptToken(tokenData.accessToken);

    // Upsert central connection
    const connection = await prisma.metaConnection.create({
      data: {
        appId: process.env.META_APP_ID || "unknown",
        metaUserId: tokenData.userId,
        metaUserName: tokenData.userName,
        accessTokenEnc: encryptedToken,
        tokenExpiresAt: expiresAt,
        scopes: [
          "business_management",
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_ads",
          "leads_retrieval",
          "ads_read",
        ],
        status: MetaSyncStatus.VERIFIED,
        lastVerifiedAt: new Date(),
      },
    });

    // Automatically trigger portfolio discovery
    try {
      await MetaService.discoverPortfolios(connection.id);
    } catch (discErr) {
      console.warn("Auto portfolio discovery note:", discErr);
    }

    return NextResponse.redirect(`${baseUrl}/admin/meta?connected=true`);
  } catch (err: unknown) {
    console.error("Meta OAuth Callback Error:", err);
    return NextResponse.redirect(
      `${baseUrl}/admin/meta?error=${encodeURIComponent(
        err instanceof Error ? err.message : "Failed to exchange token with Meta"
      )}`
    );
  }
}
