"use client";

import React, { useState, useEffect, useMemo } from "react";
import { UserPlus, RefreshCw, Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import SubcontractorOperativeTable from "./SubcontractorOperativeTable";
import SubcontractorOperativeDrawer from "./SubcontractorOperativeDrawer";
import SubcontractorInviteOperative from "./SubcontractorInviteOperative";
import SubcontractorUploadMissingDocuments from "./SubcontractorUploadMissingDocuments";
import SubcontractorRequestVerification from "./SubcontractorRequestVerification";
import type { SubcontractorOperativeRow } from "./utils/buildSubcontractorComplianceDataset";
import FeedbackLink from "@/app/components/FeedbackLink";

type LinkedSite = { id: string; name?: string };

export default function SubcontractorOnboardingPage() {
  const [rows, setRows] = useState<SubcontractorOperativeRow[]>([]);
  const [linkedSites, setLinkedSites] = useState<LinkedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<SubcontractorOperativeRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<SubcontractorOperativeRow | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<SubcontractorOperativeRow | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tradeFilter, setTradeFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [complianceRes, sitesRes] = await Promise.all([
        fetch("/api/subcontractor/compliance", { credentials: "include" }),
        fetch("/api/sites/linked", { credentials: "include" }),
      ]);
      if (complianceRes.ok) {
        const data = await complianceRes.json();
        setRows(Array.isArray(data) ? data : []);
      }
      if (sitesRes.ok) {
        const sites = await sitesRes.json();
        setLinkedSites(Array.isArray(sites) ? sites : []);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tradeOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.trade?.trim()) set.add(r.trade.trim());
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all") {
        if (statusFilter === "missing" && !row.hasMissing) return false;
        if (statusFilter === "expiring" && !row.hasExpiring) return false;
        if (statusFilter === "incomplete" && row.preInductionStatus === "complete") return false;
      }
      if (tradeFilter !== "all" && row.trade !== tradeFilter) return false;
      if (siteFilter !== "all") {
        if (!row.siteIds.includes(siteFilter)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          row.name?.toLowerCase().includes(q) ||
          row.email?.toLowerCase().includes(q) ||
          row.trade?.toLowerCase().includes(q) ||
          row.siteNames.some((s) => s?.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [rows, statusFilter, tradeFilter, siteFilter, search]);

  const selectClass =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mq = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    mq();
    window.addEventListener("resize", mq);
    return () => window.removeEventListener("resize", mq);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operative Onboarding"
        description="Manage your operatives, upload documents, complete Pre-Induction sections, and request verification."
      />

      <div className={`flex flex-col gap-6 ${drawerOpen && selectedRow && isTablet ? "md:flex-row" : ""}`}>
        {/* Main content */}
        <div className={`flex-1 min-w-0 ${drawerOpen && selectedRow && isTablet ? "md:max-w-[50%]" : ""}`}>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              <UserPlus className="h-5 w-5" />
              Invite Operative
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              Refresh
            </button>
            <FeedbackLink variant="button" />

            <div className="flex flex-wrap items-center gap-3 flex-1">
              <input
                type="search"
                placeholder="Search name, email, trade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${selectClass} min-w-[160px] flex-1 max-w-xs`}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All status</option>
                <option value="missing">Missing items</option>
                <option value="expiring">Expiring</option>
                <option value="incomplete">Incomplete Pre-Induction</option>
              </select>
              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All trades</option>
                {tradeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {linkedSites.length > 0 && (
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All sites</option>
                  {linkedSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ?? s.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <p className="text-gray-500">No operatives match your filters.</p>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="mt-3 text-blue-600 hover:underline font-medium"
              >
                Invite your first operative
              </button>
            </div>
          ) : (
            <SubcontractorOperativeTable
              rows={filteredRows}
              onRowClick={(row) => {
                setSelectedRow(row);
                setDrawerOpen(true);
              }}
              onUploadClick={(row) => setUploadTarget(row)}
              onRequestVerification={(row) => setVerifyTarget(row)}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* Drawer (desktop: side panel; tablet: second column; mobile: full-screen overlay) */}
        {drawerOpen && selectedRow && (
          <SubcontractorOperativeDrawer
            operative={selectedRow}
            isOpen={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
              setSelectedRow(null);
            }}
            onRefresh={fetchData}
            isMobile={isMobile}
            isTablet={isTablet}
          />
        )}
      </div>

      {inviteOpen && (
        <SubcontractorInviteOperative
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false);
            fetchData();
          }}
        />
      )}

      {uploadTarget && (
        <SubcontractorUploadMissingDocuments
          operative={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onSuccess={() => {
            setUploadTarget(null);
            fetchData();
          }}
        />
      )}

      {verifyTarget && (
        <SubcontractorRequestVerification
          operative={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onSuccess={() => {
            setVerifyTarget(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
