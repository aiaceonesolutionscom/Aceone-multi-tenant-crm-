import { prisma } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { MetaSyncStatus } from "@prisma/client";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaBusinessData {
  id: string;
  name: string;
  verification_status?: string;
}

export interface MetaPageData {
  id: string;
  name: string;
  access_token?: string;
}

export interface MetaAdAccountData {
  id: string;
  account_id: string;
  name: string;
  currency?: string;
  account_status?: number;
}

export class MetaService {
  /**
   * Generates the official Meta OAuth authorization URL
   */
  static getOAuthAuthorizeUrl(state: string, redirectUri: string): string {
    const appId = process.env.META_APP_ID || "your_meta_app_id";
    const scopes = [
      "business_management",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_ads",
      "leads_retrieval",
      "ads_read",
    ].join(",");

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: scopes,
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchanges an OAuth authorization code for a long-lived user access token
   */
  static async exchangeCodeForLongLivedToken(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresInSeconds: number; userId: string; userName: string }> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error("META_APP_ID and META_APP_SECRET are not configured in environment");
    }

    // 1. Exchange code for short-lived token
    const tokenUrl = `${GRAPH_BASE_URL}/oauth/access_token?` + new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    }).toString();

    const shortRes = await fetch(tokenUrl);
    const shortData = await shortRes.json();
    if (!shortRes.ok || shortData.error) {
      throw new Error(shortData.error?.message || "Failed to exchange authorization code");
    }

    const shortToken = shortData.access_token;

    // 2. Exchange short-lived token for long-lived (60 days) token
    const longTokenUrl = `${GRAPH_BASE_URL}/oauth/access_token?` + new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    }).toString();

    const longRes = await fetch(longTokenUrl);
    const longData = await longRes.json();
    const longToken = longData.access_token || shortToken;
    const expiresIn = longData.expires_in || 60 * 24 * 3600;

    // 3. Fetch central user identity
    const meRes = await fetch(`${GRAPH_BASE_URL}/me?fields=id,name&access_token=${longToken}`);
    const meData = await meRes.json();

    return {
      accessToken: longToken,
      expiresInSeconds: expiresIn,
      userId: meData.id || "unknown",
      userName: meData.name || "Central Meta Account",
    };
  }

  /**
   * Discovers Business Portfolios accessible to the central Meta user token
   */
  static async discoverPortfolios(connectionId: string): Promise<{ count: number; portfolios: string[] }> {
    const connection = await prisma.metaConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error("Meta Connection record not found");
    }

    const token = decryptToken(connection.accessTokenEnc);
    const discoveredNames: string[] = [];

    // Query /me/businesses
    const res = await fetch(`${GRAPH_BASE_URL}/me/businesses?fields=id,name,verification_status&limit=50&access_token=${token}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(`Meta Graph API error: ${data.error.message}`);
    }

    const businesses: MetaBusinessData[] = data.data || [];

    for (const biz of businesses) {
      discoveredNames.push(biz.name);
      await prisma.businessPortfolio.upsert({
        where: { metaBusinessId: biz.id },
        update: {
          name: biz.name,
          status: MetaSyncStatus.VERIFIED,
          lastSyncedAt: new Date(),
        },
        create: {
          metaConnectionId: connection.id,
          metaBusinessId: biz.id,
          name: biz.name,
          status: MetaSyncStatus.VERIFIED,
          lastSyncedAt: new Date(),
        },
      });
    }

    return { count: businesses.length, portfolios: discoveredNames };
  }

  /**
   * Discovers and synchronizes all assets (Ad Accounts, Pages, Forms, Campaigns, Ads) for a portfolio
   */
  static async syncPortfolioAssets(portfolioId: string): Promise<void> {
    const portfolio = await prisma.businessPortfolio.findUnique({
      where: { id: portfolioId },
      include: { metaConnection: true },
    });

    if (!portfolio || !portfolio.metaConnection) {
      throw new Error("Portfolio or Meta connection not found");
    }

    const token = decryptToken(portfolio.metaConnection.accessTokenEnc);

    // 1. Fetch Ad Accounts: /{business_id}/owned_ad_accounts and client_ad_accounts
    try {
      const adAccRes = await fetch(
        `${GRAPH_BASE_URL}/${portfolio.metaBusinessId}/owned_ad_accounts?fields=id,account_id,name,currency,account_status&access_token=${token}`
      );
      const adAccData = await adAccRes.json();

      if (adAccData.data && Array.isArray(adAccData.data)) {
        for (const acc of adAccData.data) {
          const adAccount = await prisma.adAccount.upsert({
            where: { metaAccountId: acc.id },
            update: {
              name: acc.name || `Ad Account ${acc.account_id}`,
              currency: acc.currency,
              accountStatus: acc.account_status,
            },
            create: {
              businessPortfolioId: portfolio.id,
              metaAccountId: acc.id,
              name: acc.name || `Ad Account ${acc.account_id}`,
              currency: acc.currency,
              accountStatus: acc.account_status,
            },
          });

          // Fetch Campaigns for this Ad Account
          await this.syncCampaignsForAdAccount(adAccount.id, acc.id, token);
        }
      }
    } catch (e) {
      console.error(`Error syncing ad accounts for portfolio ${portfolio.name}:`, e);
    }

    // 2. Fetch Facebook Pages: /{business_id}/client_pages and owned_pages
    try {
      const pageRes = await fetch(
        `${GRAPH_BASE_URL}/${portfolio.metaBusinessId}/client_pages?fields=id,name,access_token&access_token=${token}`
      );
      const pageData = await pageRes.json();

      if (pageData.data && Array.isArray(pageData.data)) {
        for (const pg of pageData.data) {
          const encPageToken = pg.access_token ? encryptToken(pg.access_token) : null;
          const page = await prisma.facebookPage.upsert({
            where: { metaPageId: pg.id },
            update: {
              name: pg.name,
              ...(encPageToken && { pageAccessTokenEnc: encPageToken }),
              leadAccessStatus: "VERIFIED",
            },
            create: {
              businessPortfolioId: portfolio.id,
              metaPageId: pg.id,
              name: pg.name,
              pageAccessTokenEnc: encPageToken,
              leadAccessStatus: "VERIFIED",
            },
          });

          // Fetch Lead Forms for this Page
          if (pg.access_token) {
            await this.syncLeadFormsForPage(page.id, pg.id, pg.access_token);
          }
        }
      }
    } catch (e) {
      console.error(`Error syncing pages for portfolio ${portfolio.name}:`, e);
    }

    await prisma.businessPortfolio.update({
      where: { id: portfolio.id },
      data: { lastSyncedAt: new Date() },
    });
  }

  /**
   * Discovers Lead Forms for a Facebook Page
   */
  private static async syncLeadFormsForPage(pageId: string, metaPageId: string, pageToken: string) {
    try {
      const formsRes = await fetch(
        `${GRAPH_BASE_URL}/${metaPageId}/leadgen_forms?fields=id,name,status,questions&access_token=${pageToken}`
      );
      const formsData = await formsRes.json();

      if (formsData.data && Array.isArray(formsData.data)) {
        for (const frm of formsData.data) {
          await prisma.metaForm.upsert({
            where: { metaFormId: frm.id },
            update: {
              name: frm.name,
              status: frm.status,
              questionsJson: frm.questions || null,
            },
            create: {
              facebookPageId: pageId,
              metaFormId: frm.id,
              name: frm.name,
              status: frm.status,
              questionsJson: frm.questions || null,
            },
          });
        }
      }
    } catch (e) {
      console.error(`Error syncing forms for page ${metaPageId}:`, e);
    }
  }

  /**
   * Discovers Campaigns, AdSets, and Ads for an Ad Account
   */
  private static async syncCampaignsForAdAccount(adAccountId: string, metaAccountId: string, token: string) {
    try {
      const campRes = await fetch(
        `${GRAPH_BASE_URL}/${metaAccountId}/campaigns?fields=id,name,status,objective&access_token=${token}`
      );
      const campData = await campRes.json();

      if (campData.data && Array.isArray(campData.data)) {
        for (const cmp of campData.data) {
          const campaign = await prisma.campaign.upsert({
            where: { metaCampaignId: cmp.id },
            update: {
              name: cmp.name,
              status: cmp.status,
              objective: cmp.objective,
            },
            create: {
              adAccountId,
              metaCampaignId: cmp.id,
              name: cmp.name,
              status: cmp.status,
              objective: cmp.objective,
            },
          });

          // Fetch Ad Sets
          const adsetRes = await fetch(
            `${GRAPH_BASE_URL}/${cmp.id}/adsets?fields=id,name,status&access_token=${token}`
          );
          const adsetData = await adsetRes.json();

          if (adsetData.data && Array.isArray(adsetData.data)) {
            for (const ads of adsetData.data) {
              const adSet = await prisma.adSet.upsert({
                where: { metaAdSetId: ads.id },
                update: { name: ads.name, status: ads.status },
                create: {
                  campaignId: campaign.id,
                  metaAdSetId: ads.id,
                  name: ads.name,
                  status: ads.status,
                },
              });

              // Fetch Ads
              const adRes = await fetch(
                `${GRAPH_BASE_URL}/${ads.id}/ads?fields=id,name,status&access_token=${token}`
              );
              const adData = await adRes.json();
              if (adData.data && Array.isArray(adData.data)) {
                for (const a of adData.data) {
                  await prisma.ad.upsert({
                    where: { metaAdId: a.id },
                    update: { name: a.name, status: a.status },
                    create: {
                      adSetId: adSet.id,
                      metaAdId: a.id,
                      name: a.name,
                      status: a.status,
                    },
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error syncing campaigns for ${metaAccountId}:`, e);
    }
  }

  /**
   * Fetches full lead payload from Meta Graph API using leadgen_id
   */
  static async fetchLeadFromGraphApi(leadgenId: string, pageToken: string) {
    const url = `${GRAPH_BASE_URL}/${leadgenId}?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data,platform&access_token=${pageToken}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      throw new Error(`Graph API Lead fetch error (${data.error.code}): ${data.error.message}`);
    }

    return data;
  }
}
