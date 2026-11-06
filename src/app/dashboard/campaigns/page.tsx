"use client";

import { useEffect, useState } from "react";
import {
  Layers,
  FolderGit2,
  Share2,
  FileSpreadsheet,
  CheckCircle2,
  Inbox,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  metaCampaignId: string;
  status: string | null;
  objective: string | null;
  _count: { leads: number };
  adSets: Array<{
    id: string;
    name: string;
    metaAdSetId: string;
    status: string | null;
    _count: { leads: number };
    ads: Array<{
      id: string;
      name: string;
      metaAdId: string;
      status: string | null;
      _count: { leads: number };
    }>;
  }>;
}

interface PortfolioData {
  name: string;
  metaBusinessId: string;
  adAccounts: Array<{
    id: string;
    name: string;
    metaAccountId: string;
    currency: string | null;
    campaigns: CampaignItem[];
  }>;
  pages: Array<{
    id: string;
    name: string;
    metaPageId: string;
    forms: Array<{
      id: string;
      name: string;
      metaFormId: string;
      status: string | null;
      _count: { leads: number };
    }>;
  }>;
}

export default function CampaignsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/campaigns")
      .then((res) => res.json())
      .then((json) => {
        setPortfolio(json.portfolio || null);
        if (json.portfolio?.adAccounts?.[0]?.campaigns?.[0]) {
          setExpandedCampaignId(json.portfolio.adAccounts[0].campaigns[0].id);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
        No Meta Business Portfolio assigned to your account yet. Contact AceOne Administration.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Meta Campaigns & Ads Hierarchy</h1>
        <p className="text-sm text-slate-500">
          Authorized Meta advertising structure and lead generation attribution for {portfolio.name}.
        </p>
      </div>

      {/* Portfolio Info Banner */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">{portfolio.name}</div>
            <div className="text-xs text-slate-500 font-mono">
              Business ID: {portfolio.metaBusinessId}
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active Meta Sync</span>
        </span>
      </div>

      {/* Ad Accounts & Campaigns Section */}
      <div className="space-y-6">
        {portfolio.adAccounts.map((acc) => (
          <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 text-sm">{acc.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">({acc.metaAccountId})</span>
              </div>
              <span className="font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                Currency: {acc.currency || "USD"}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {acc.campaigns.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No campaigns found in this ad account.</p>
              ) : (
                acc.campaigns.map((camp) => {
                  const isExpanded = expandedCampaignId === camp.id;

                  return (
                    <div key={camp.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Campaign Header */}
                      <button
                        onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                        className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{camp.name}</span>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              ID: {camp.metaCampaignId} • Objective: {camp.objective || "LEADS"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {camp.status || "ACTIVE"}
                          </span>
                          <span className="px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {camp._count.leads} Leads
                          </span>
                        </div>
                      </button>

                      {/* Nested AdSets and Ads */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/70 border-t border-slate-200 space-y-3 text-xs">
                          {camp.adSets.length === 0 ? (
                            <p className="text-slate-400 italic">No ad sets discovered.</p>
                          ) : (
                            camp.adSets.map((adSet) => (
                              <div key={adSet.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                                <div className="flex items-center justify-between font-semibold text-slate-900">
                                  <span>Ad Set: {adSet.name}</span>
                                  <span className="text-slate-500 font-mono text-[11px]">
                                    {adSet._count.leads} Leads
                                  </span>
                                </div>

                                <div className="pl-3 border-l-2 border-slate-200 space-y-1 text-[11px]">
                                  {adSet.ads.map((ad) => (
                                    <div key={ad.id} className="flex items-center justify-between text-slate-700">
                                      <span>Creative: {ad.name}</span>
                                      <span className="font-bold text-blue-600">{ad._count.leads} Leads</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pages and Forms Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-blue-600" />
          <span>Facebook Pages & Instant Lead Forms</span>
        </h2>

        <div className="space-y-4 text-xs">
          {portfolio.pages.map((pg) => (
            <div key={pg.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-slate-900 text-sm">{pg.name}</div>
              <div className="space-y-2">
                {pg.forms.map((frm) => (
                  <div key={frm.id} className="p-2.5 bg-white border border-slate-200 rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{frm.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Form ID: {frm.metaFormId}</div>
                    </div>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {frm._count.leads} Submissions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
