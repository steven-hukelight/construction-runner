"use client";

import { useState, useEffect } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import {
  Wrench,
  RefreshCw,
  Database,
  FileCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Copy,
  History,
  KeyRound,
  Mail,
  Upload,
  Users,
} from "lucide-react";
type Company = { id: string; name: string | null };

export default function SuperuserToolsPage() {
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [exportCompanyId, setExportCompanyId] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [grandfatherSiteId, setGrandfatherSiteId] = useState("");
  const [copyTemplateId, setCopyTemplateId] = useState("");
  const [copyNewName, setCopyNewName] = useState("");
  const [bulkInviteCompanyId, setBulkInviteCompanyId] = useState("");
  const [bulkInviteEmails, setBulkInviteEmails] = useState("");
  const [importCsvCompanyId, setImportCsvCompanyId] = useState("");
  const [importCsvFile, setImportCsvFile] = useState<File | null>(null);
  const [syncProfileCompanyId, setSyncProfileCompanyId] = useState("");
  const [validateResult, setValidateResult] = useState<{
    perCompany: Record<string, Record<string, number>>;
    missingCompanyId: Record<string, number>;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
  }, []);

  async function runTool(id: string, endpoint: string) {
    setRunning(id);
    setMessage(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Done." });
      } else {
        setMessage({ type: "error", text: data.error ?? "Request failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Request failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleExport() {
    if (!exportCompanyId) {
      setMessage({ type: "error", text: "Select a company first." });
      return;
    }
    setRunning("export");
    setMessage(null);
    try {
      const res = await fetch(`/api/maintenance/export-company?companyId=${encodeURIComponent(exportCompanyId)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: err.error ?? "Export failed." });
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company-${exportCompanyId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "ok", text: "Export downloaded." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleValidate() {
    setRunning("validate");
    setMessage(null);
    setValidateResult(null);
    try {
      const res = await fetch("/api/maintenance/validate-data");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: err.error ?? "Validate failed." });
        return;
      }
      const data = await res.json();
      setValidateResult({
        perCompany: data.perCompany ?? {},
        missingCompanyId: data.missingCompanyId ?? {},
        message: data.message ?? "",
      });
      setMessage({ type: "ok", text: data.message ?? "Validation complete." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Validate failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleAuditExport() {
    setRunning("audit-export");
    setMessage(null);
    try {
      const res = await fetch("/api/maintenance/audit-log-export?limit=2000", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: err.error ?? "Export failed." });
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "ok", text: `Exported ${data.count ?? 0} audit log entries.` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handlePasswordReset() {
    if (!passwordResetEmail.trim()) {
      setMessage({ type: "error", text: "Enter email address." });
      return;
    }
    setRunning("password-reset");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: passwordResetEmail.trim() }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Password reset email sent." });
        setPasswordResetEmail("");
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleGrandfather() {
    setRunning("grandfather");
    setMessage(null);
    try {
      const res = await fetch("/api/maintenance/grandfather-inductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: grandfatherSiteId.trim() || undefined }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Done." });
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleBulkInvite() {
    if (!bulkInviteCompanyId || !bulkInviteEmails.trim()) {
      setMessage({ type: "error", text: "Select company and enter emails." });
      return;
    }
    const lines = bulkInviteEmails.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const invites = lines.map((line) => {
      const [email, name] = line.split(/[,\t]/).map((s) => s.trim());
      return { email: email || "", name: name || "" };
    }).filter((i) => i.email && i.email.includes("@"));

    if (invites.length === 0) {
      setMessage({ type: "error", text: "Enter at least one valid email (one per line, or email,name)." });
      return;
    }

    setRunning("bulk-invite");
    setMessage(null);
    try {
      const res = await fetch("/api/maintenance/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: bulkInviteCompanyId, invites }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Done." });
        setBulkInviteEmails("");
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleImportCsv() {
    if (!importCsvCompanyId || !importCsvFile) {
      setMessage({ type: "error", text: "Select company and choose a CSV file." });
      return;
    }
    setRunning("import-csv");
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", importCsvFile);
      form.append("companyId", importCsvCompanyId);
      const res = await fetch("/api/maintenance/import-users-csv", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Done." });
        setImportCsvFile(null);
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleSyncProfile() {
    setRunning("sync-profile");
    setMessage(null);
    try {
      const res = await fetch("/api/maintenance/sync-profile-to-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: syncProfileCompanyId.trim() || undefined }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Done." });
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setRunning(null);
    }
  }

  async function handleCopyCompany() {
    if (!copyTemplateId || !copyNewName.trim()) {
      setMessage({ type: "error", text: "Select template and enter new company name." });
      return;
    }
    setRunning("copy-company");
    setMessage(null);
    try {
      const res = await fetch("/api/maintenance/copy-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCompanyId: copyTemplateId, newName: copyNewName.trim() }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: data.message ?? "Company created." });
        setCopyNewName("");
        fetch("/api/companies").then((r) => r.json()).then((d) => setCompanies(Array.isArray(d) ? d : []));
      } else {
        setMessage({ type: "error", text: data.error ?? "Failed." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="relative space-y-8">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />

      <PageHeader
        title="Superuser tools"
        description="Maintenance, export, and data validation. Use with care."
      />

      {message && (
        <div
          className={`rounded-xl border p-4 ${
            message.type === "ok"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Attendance refresh</h3>
              <p className="text-sm text-gray-600">Rebuild attendance cache from source data</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runTool("attendance", "/api/maintenance/attendance-refresh")}
            disabled={!!running}
            className="inline-flex items-center gap-2"
          >
            {running === "attendance" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Run refresh
          </Button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Seed cert training</h3>
              <p className="text-sm text-gray-600">Dev-only: seed certifications and training data</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runTool("seed", "/api/dev/seed-cert-training")}
            disabled={!!running}
            className="inline-flex items-center gap-2"
          >
            {running === "seed" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck className="w-4 h-4" />
            )}
            Run seed
          </Button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Export company data</h3>
              <p className="text-sm text-gray-600">Download all data for one company as JSON</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={exportCompanyId}
              onChange={(e) => setExportCompanyId(e.target.value)}
              className="input w-full max-w-[200px]"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExport}
              disabled={!!running || !exportCompanyId}
              className="inline-flex items-center gap-2"
            >
              {running === "export" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download JSON
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Validate data</h3>
              <p className="text-sm text-gray-600">Check companyId coverage and counts per company</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleValidate}
            disabled={!!running}
            className="inline-flex items-center gap-2"
          >
            {running === "validate" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Run validation
          </Button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Audit log export</h3>
              <p className="text-sm text-gray-600">Download activity logs for compliance</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAuditExport}
            disabled={!!running}
            className="inline-flex items-center gap-2"
          >
            {running === "audit-export" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download JSON
          </Button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Trash2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Retention cleanup</h3>
              <p className="text-sm text-gray-600">GDPR: delete old inductions, training, RAMS data</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runTool("retention", "/api/maintenance/retention-cleanup")}
            disabled={!!running}
            className="inline-flex items-center gap-2"
          >
            {running === "retention" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Run cleanup
          </Button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <KeyRound className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Password reset</h3>
              <p className="text-sm text-gray-600">Send reset email to a user by email</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={passwordResetEmail}
              onChange={(e) => setPasswordResetEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full max-w-[200px] px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePasswordReset}
              disabled={!!running || !passwordResetEmail.trim()}
              className="inline-flex items-center gap-2"
            >
              {running === "password-reset" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Send reset
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Grandfather inductions</h3>
              <p className="text-sm text-gray-600">Batch-mark completed site inductions as grandfathered</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={grandfatherSiteId}
              onChange={(e) => setGrandfatherSiteId(e.target.value)}
              placeholder="Site ID (blank = all)"
              className="w-full max-w-[180px] px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleGrandfather}
              disabled={!!running}
              className="inline-flex items-center gap-2"
            >
              {running === "grandfather" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              Run
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Copy className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Copy company from template</h3>
              <p className="text-sm text-gray-600">Create new company with sites & rules from template</p>
            </div>
          </div>
          <div className="space-y-2">
            <select
              value={copyTemplateId}
              onChange={(e) => setCopyTemplateId(e.target.value)}
              className="w-full max-w-[240px] px-4 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select template</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            <input
              type="text"
              value={copyNewName}
              onChange={(e) => setCopyNewName(e.target.value)}
              placeholder="New company name"
              className="w-full max-w-[240px] block px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyCompany}
              disabled={!!running || !copyTemplateId || !copyNewName.trim()}
              className="inline-flex items-center gap-2"
            >
              {running === "copy-company" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              Create company
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bulk invite</h3>
              <p className="text-sm text-gray-600">Send invite emails to many users for one company</p>
            </div>
          </div>
          <div className="space-y-2">
            <select
              value={bulkInviteCompanyId}
              onChange={(e) => setBulkInviteCompanyId(e.target.value)}
              className="w-full max-w-[240px] block px-4 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            <textarea
              value={bulkInviteEmails}
              onChange={(e) => setBulkInviteEmails(e.target.value)}
              placeholder="email@example.com (one per line, or email,name)"
              rows={4}
              className="w-full max-w-[320px] block px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkInvite}
              disabled={!!running || !bulkInviteCompanyId || !bulkInviteEmails.trim()}
              className="inline-flex items-center gap-2"
            >
              {running === "bulk-invite" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send invites
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Import users from CSV</h3>
              <p className="text-sm text-gray-600">Bulk create registrations. CSV: email, name</p>
            </div>
          </div>
          <div className="space-y-2">
            <select
              value={importCsvCompanyId}
              onChange={(e) => setImportCsvCompanyId(e.target.value)}
              className="w-full max-w-[240px] block px-4 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setImportCsvFile(e.target.files?.[0] ?? null)}
              className="block w-full max-w-[240px] text-sm text-gray-600"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleImportCsv}
              disabled={!!running || !importCsvCompanyId || !importCsvFile}
              className="inline-flex items-center gap-2"
            >
              {running === "import-csv" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sync profile to user docs</h3>
              <p className="text-sm text-gray-600">Copy displayName, phone from profile subcollection to user docs</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={syncProfileCompanyId}
              onChange={(e) => setSyncProfileCompanyId(e.target.value)}
              className="w-full max-w-[200px] px-4 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.id}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSyncProfile}
              disabled={!!running}
              className="inline-flex items-center gap-2"
            >
              {running === "sync-profile" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Run sync
            </Button>
          </div>
        </div>
      </div>

      {validateResult && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Validation result
          </h3>
          <p className="text-sm text-gray-600 mb-4">{validateResult.message}</p>
          {Object.keys(validateResult.missingCompanyId).length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Documents missing companyId
              </h4>
              <ul className="text-sm text-amber-900 space-y-1">
                {Object.entries(validateResult.missingCompanyId)
                  .filter(([, n]) => n > 0)
                  .map(([col, n]) => (
                    <li key={col}>{col}: {n}</li>
                  ))}
              </ul>
              <p className="text-xs text-amber-700 mt-2">
                Run <code className="bg-amber-100 px-1 rounded">node scripts/migrate-legacy-to-test-company.js</code> to assign them to Test Company.
              </p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-700">Company</th>
                  <th className="text-left py-2 font-medium text-gray-700">Sites</th>
                  <th className="text-left py-2 font-medium text-gray-700">Users</th>
                  <th className="text-left py-2 font-medium text-gray-700">Tasks</th>
                  <th className="text-left py-2 font-medium text-gray-700">Notices</th>
                  <th className="text-left py-2 font-medium text-gray-700">RAMS</th>
                  <th className="text-left py-2 font-medium text-gray-700">Deliveries</th>
                  <th className="text-left py-2 font-medium text-gray-700">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(validateResult.perCompany).map(([companyId, counts]) => (
                  <tr key={companyId} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{companies.find((c) => c.id === companyId)?.name ?? companyId}</td>
                    <td className="py-2">{counts.sites ?? 0}</td>
                    <td className="py-2">{counts.users ?? 0}</td>
                    <td className="py-2">{counts.tasks ?? 0}</td>
                    <td className="py-2">{counts.notices ?? 0}</td>
                    <td className="py-2">{counts.rams ?? 0}</td>
                    <td className="py-2">{counts.deliveries ?? 0}</td>
                    <td className="py-2">{counts.attendance ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
