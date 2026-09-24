import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import {
  ASSET_INSPECTION_INTERVAL_PRESETS,
  assetInspectionDueStatus,
} from "@/lib/assets/inspectionSchedule";
import { createReportPdf } from "@/lib/pdf/createReportPdf";
import { resolveCompanyPdfBranding } from "@/lib/pdf/resolveCompanyPdfBranding";
import { formatPdfDateTime } from "@/lib/pdf/formatPdfDateTime";
import { PDF_THEME } from "@/lib/pdf/documentChrome";

function intervalLabel(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days) || days <= 0) return "No schedule";
  const preset = ASSET_INSPECTION_INTERVAL_PRESETS.find((p) => p.days === days);
  return preset ? `Every ${preset.label}` : `Every ${days} days`;
}

/** GET /api/assets/[id]/export — PDF asset summary. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data: asset, error: assetErr } = await supabaseAdmin
      .from("assets")
      .select(
        "id, name, type, status, description, serial_number, site_id, company_id, created_at, inspection_interval_days, last_inspected_at, next_inspection_due, inspection_reminder_days_before, inspection_required",
      )
      .eq("id", id)
      .maybeSingle();

    if (assetErr || !asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (companyId && asset.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let siteName = "—";
    if (asset.site_id) {
      const { data: site } = await supabaseAdmin
        .from("sites")
        .select("name")
        .eq("id", asset.site_id)
        .maybeSingle();
      if (site?.name) siteName = site.name;
    }

    const { data: assigns } = await supabaseAdmin
      .from("asset_assignments")
      .select("user_id, assigned_at")
      .eq("asset_id", id);
    const userIds = [...new Set((assigns ?? []).map((a) => a.user_id))];
    const nameByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, display_name, name, email")
        .in("id", userIds);
      for (const u of users ?? []) {
        const ur = u as {
          id: string;
          display_name?: string;
          name?: string;
          email?: string;
        };
        nameByUser.set(
          ur.id,
          (ur.display_name || ur.name || ur.email || ur.id).trim() || ur.id,
        );
      }
    }

    const { data: inspections } = await supabaseAdmin
      .from("asset_inspections")
      .select("id, notes, status, created_at, user_id")
      .eq("asset_id", id)
      .order("created_at", { ascending: false })
      .limit(25);

    const inspUserIds = [
      ...new Set(
        (inspections ?? []).map((i) => (i as { user_id: string }).user_id),
      ),
    ].filter((uid) => uid && !nameByUser.has(uid));
    if (inspUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id, display_name, name, email")
        .in("id", inspUserIds);
      for (const u of users ?? []) {
        const ur = u as {
          id: string;
          display_name?: string;
          name?: string;
          email?: string;
        };
        nameByUser.set(
          ur.id,
          (ur.display_name || ur.name || ur.email || ur.id).trim() || ur.id,
        );
      }
    }

    const dueStatus = assetInspectionDueStatus({
      nextDue: asset.next_inspection_due,
      reminderDaysBefore: asset.inspection_reminder_days_before,
      inspectionRequired: asset.inspection_required,
    });
    const dueLabel =
      dueStatus === "overdue"
        ? "Overdue"
        : dueStatus === "due_soon"
          ? "Due soon"
          : dueStatus === "ok"
            ? "On schedule"
            : "No schedule";

    const branding = await resolveCompanyPdfBranding(
      asset.company_id ?? companyId,
    );

    const report = createReportPdf({
      title: "Asset report",
      subtitle: String(asset.name ?? "Asset"),
      metaLines: siteName !== "—" ? [`Site: ${siteName}`] : undefined,
      branding,
      footerLabel: "Construction Runner — asset report",
    });

    report.section("Asset details");
    report.field("Name", String(asset.name ?? "—"));
    report.field("Type", String(asset.type ?? "—"));
    report.field("Status", String(asset.status ?? "—"));
    report.field("Serial", String(asset.serial_number ?? "—"));
    report.field("Site", siteName);
    report.field("Created", formatPdfDateTime(asset.created_at));
    if (asset.description) {
      report.field("Notes", String(asset.description));
    }

    report.section("Inspection schedule");
    report.field("Interval", intervalLabel(asset.inspection_interval_days));
    report.field("Due status", dueLabel);
    report.field(
      "Next due",
      asset.next_inspection_due ? String(asset.next_inspection_due) : "—",
    );
    report.field("Last inspected", formatPdfDateTime(asset.last_inspected_at));

    report.section("Assigned to");
    if (!assigns || assigns.length === 0) {
      report.paragraph("None", 9);
    } else {
      for (const a of assigns) {
        const uid = (a as { user_id: string }).user_id;
        const at = (a as { assigned_at?: string }).assigned_at;
        report.field(
          "Person",
          `${nameByUser.get(uid) ?? uid}${at ? ` · since ${formatPdfDateTime(at)}` : ""}`,
        );
      }
    }

    report.section("Inspection history");
    if (!inspections || inspections.length === 0) {
      report.paragraph("No inspections recorded.", 9);
    } else {
      const { doc, margin } = report;
      for (const insp of inspections) {
        const ir = insp as {
          status?: string;
          notes?: string | null;
          created_at?: string;
          user_id?: string;
        };
        report.ensureSpace(16);
        let y = report.y;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...PDF_THEME.text);
        doc.text(
          `${formatPdfDateTime(ir.created_at)} · ${(ir.status ?? "completed").toString()}`,
          margin,
          y,
        );
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_THEME.muted);
        const who = ir.user_id
          ? (nameByUser.get(ir.user_id) ?? ir.user_id)
          : "—";
        doc.text(`By: ${who}`, margin + 2, y);
        y += 5;
        if (ir.notes?.trim()) {
          doc.setTextColor(...PDF_THEME.text);
          const notes = doc.splitTextToSize(
            ir.notes.trim(),
            report.pageWidth() - margin * 2 - 4,
          );
          doc.text(notes, margin + 2, y);
          y += notes.length * 4.5 + 3;
        } else {
          y += 3;
        }
        doc.setDrawColor(...PDF_THEME.rule);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 1, report.pageWidth() - margin, y - 1);
        report.setY(y + 2);
      }
    }

    const slug =
      String(asset.name ?? "asset")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "asset";
    const filename = `asset-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const buffer = report.toBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/assets/[id]/export:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
