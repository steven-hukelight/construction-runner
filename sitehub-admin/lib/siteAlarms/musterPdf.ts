import { createReportPdf } from "@/lib/pdf/createReportPdf";
import type { PdfBranding } from "@/lib/pdf/documentChrome";
import { ALARM_LABELS, roleLabel, type AlarmType, type MusterBoard } from "@/lib/siteAlarms/types";

function londonStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export type MusterPdfAlarm = {
  type: AlarmType;
  is_drill: boolean;
  site_name: string;
  raised_by_name: string;
  raised_by_role: string | null;
  raised_at: string;
  additional_raisers: { name: string; raised_at: string }[];
  stood_down_by_name: string | null;
  stood_down_at: string | null;
  stand_down_reason: string | null;
  outcome: string | null;
  note: string | null;
};

function peopleLines(
  report: ReturnType<typeof createReportPdf>,
  heading: string,
  people: { name: string; role: string | null; responded_at?: string }[],
) {
  report.section(heading);
  if (!people.length) {
    report.paragraph("None.");
    return;
  }
  const { doc, margin } = report;
  people.forEach((p, i) => {
    report.ensureSpace(8);
    const y = report.y;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(28, 32, 38);
    const role = roleLabel(p.role);
    doc.text(`${i + 1}.  ${p.name}${role ? ` (${role})` : ""}`, margin, y);
    if (p.responded_at) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 124);
      doc.text(londonStamp(p.responded_at), margin + 6, y + 4.5);
      report.setY(y + 10);
    } else {
      report.setY(y + 6);
    }
  });
}

export function buildMusterReportPdf(alarm: MusterPdfAlarm, board: MusterBoard, branding?: PdfBranding | null) {
  const kind = alarm.is_drill ? "Drill" : ALARM_LABELS[alarm.type].name;
  const report = createReportPdf({
    title: `${kind} muster record`,
    subtitle: alarm.site_name,
    metaLines: [
      `Raised by ${alarm.raised_by_name}${alarm.raised_by_role ? ` (${alarm.raised_by_role})` : ""} at ${londonStamp(alarm.raised_at)}`,
      alarm.stood_down_at
        ? `Stood down by ${alarm.stood_down_by_name ?? "a supervisor"} at ${londonStamp(alarm.stood_down_at)}`
        : "Still active",
    ],
    branding,
    footerLabel: "Construction Runner, site alarm muster",
  });

  if (alarm.additional_raisers.length) {
    report.field("Also raised by", alarm.additional_raisers.map((r) => `${r.name} (${londonStamp(r.raised_at)})`).join("; "));
  }
  if (alarm.note) report.field("Note", alarm.note);
  if (alarm.outcome) report.field("Outcome", alarm.outcome.replace("_", " "));
  if (alarm.stand_down_reason) report.field("Stand-down reason", alarm.stand_down_reason);

  peopleLines(report, `Unaccounted (${board.unaccounted.length})`, board.unaccounted);
  peopleLines(report, `Need help (${board.needHelp.length})`, board.needHelp);
  peopleLines(report, `First aiders responding (${board.responding.length})`, board.responding);
  peopleLines(report, `Safe (${board.safe.length})`, board.safe);

  report.applyFooters();
  return report.doc;
}
