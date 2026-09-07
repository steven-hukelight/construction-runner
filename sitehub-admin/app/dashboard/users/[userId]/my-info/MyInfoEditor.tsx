"use client";

/**
 * MyInfoEditor — admin/supervisor-facing editor for a worker's My Info.
 *
 * Consolidates the 4 sections that survived the reflow:
 *   - Medical
 *   - Emergency contact
 *   - Competency card
 *   - Declarations
 *
 * Every save PUTs to /api/admin/users/[id]/info, which audit-logs the edit
 * as `my_info_edited_on_behalf` when the actor is not the target user.
 *
 * Section widgets are inlined here rather than reused from the legacy
 * pre-induction section files so we don't have to preserve the old status/
 * completeness gate wiring — this UI intentionally has no attendance gate.
 */

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Save, User, Heart, CreditCard, FileSignature, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirror lib/myInfo.ts)
// ---------------------------------------------------------------------------

type Medical = {
  medicalDeclaration: string | null;
  fitToWork: boolean | null;
  hasMedicalIssues: boolean | null;
  allergies: string | null;
  medication: string | null;
  medicalCertificateUrl: string | null;
  medicalVerified: boolean;
  notes: string | null;
};

type EmergencyContact = { name: string | null; phone: string | null };

type CompetencyCard = {
  cardType: string | null;
  cardNumber: string | null;
  expiryDate: string | null;
  cardImageUrl: string | null;
};

type Declarations = {
  operativeDeclarationAccepted: boolean;
  operativeSignatureUrl: string | null;
  supervisorDeclarationAccepted: boolean;
  notes: string | null;
};

type MyInfoPayload = {
  userId: string;
  medical: Medical | null;
  emergencyContact: EmergencyContact;
  competencyCard: CompetencyCard | null;
  declarations: Declarations | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MyInfoEditor({ userId }: { userId: string }) {
  const [payload, setPayload] = useState<MyInfoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<null | "medical" | "emergency" | "competency" | "declarations">(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/info`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MyInfoPayload;
      setPayload(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load My Info");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (section: "medical" | "emergency" | "competency" | "declarations", patchBody: Record<string, unknown>) => {
    setSaving(section);
    try {
      const res = await fetch(`/api/admin/users/${userId}/info`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  if (loading || !payload) {
    return (
      <div className="flex items-center gap-2 py-16 justify-center text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmergencySection
        value={payload.emergencyContact}
        saving={saving === "emergency"}
        onSave={(v) => save("emergency", { emergencyContact: v })}
      />
      <MedicalSection
        value={payload.medical}
        saving={saving === "medical"}
        onSave={(v) => save("medical", { medical: v })}
      />
      <CompetencySection
        value={payload.competencyCard}
        saving={saving === "competency"}
        onSave={(v) => save("competency", { competencyCard: v })}
      />
      <DeclarationsSection
        value={payload.declarations}
        saving={saving === "declarations"}
        onSave={(v) => save("declarations", { declarations: v })}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Emergency contact
// ---------------------------------------------------------------------------

function EmergencySection({
  value,
  saving,
  onSave,
}: {
  value: EmergencyContact;
  saving: boolean;
  onSave: (v: EmergencyContact) => void;
}) {
  const [name, setName] = useState(value.name ?? "");
  const [phone, setPhone] = useState(value.phone ?? "");
  useEffect(() => {
    setName(value.name ?? "");
    setPhone(value.phone ?? "");
  }, [value]);

  return (
    <Section title="Emergency contact" icon={<User className="w-5 h-5" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name">
          <Input value={name} onChange={setName} placeholder="e.g. Jane Doe" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={setPhone} placeholder="+44 7…" />
        </Field>
      </div>
      <SaveRow saving={saving} onClick={() => onSave({ name: name.trim() || null, phone: phone.trim() || null })} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Section: Medical
// ---------------------------------------------------------------------------

function MedicalSection({
  value,
  saving,
  onSave,
}: {
  value: Medical | null;
  saving: boolean;
  onSave: (v: Partial<Medical>) => void;
}) {
  const [fitToWork, setFitToWork] = useState<boolean | null>(value?.fitToWork ?? null);
  const [hasMedicalIssues, setHasMedicalIssues] = useState<boolean | null>(value?.hasMedicalIssues ?? null);
  const [allergies, setAllergies] = useState(value?.allergies ?? "");
  const [medication, setMedication] = useState(value?.medication ?? "");
  const [declaration, setDeclaration] = useState(value?.medicalDeclaration ?? "");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [verified, setVerified] = useState(!!value?.medicalVerified);

  useEffect(() => {
    setFitToWork(value?.fitToWork ?? null);
    setHasMedicalIssues(value?.hasMedicalIssues ?? null);
    setAllergies(value?.allergies ?? "");
    setMedication(value?.medication ?? "");
    setDeclaration(value?.medicalDeclaration ?? "");
    setNotes(value?.notes ?? "");
    setVerified(!!value?.medicalVerified);
  }, [value]);

  return (
    <Section title="Medical" icon={<Heart className="w-5 h-5" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Fit to work">
          <TriState value={fitToWork} onChange={setFitToWork} labels={{ yes: "Yes", no: "No", unset: "Not stated" }} />
        </Field>
        <Field label="Has medical issues">
          <TriState value={hasMedicalIssues} onChange={setHasMedicalIssues} labels={{ yes: "Yes", no: "No", unset: "Not stated" }} />
        </Field>
        <Field label="Allergies">
          <Input value={allergies} onChange={setAllergies} placeholder="e.g. Penicillin" />
        </Field>
        <Field label="Medication">
          <Input value={medication} onChange={setMedication} placeholder="e.g. Insulin" />
        </Field>
      </div>
      <Field label="Medical declaration (free text)">
        <Textarea value={declaration} onChange={setDeclaration} rows={2} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={setNotes} rows={2} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        <span>Verified by admin/supervisor</span>
      </label>
      <SaveRow
        saving={saving}
        onClick={() =>
          onSave({
            fitToWork,
            hasMedicalIssues,
            allergies: allergies.trim() || null,
            medication: medication.trim() || null,
            medicalDeclaration: declaration.trim() || null,
            notes: notes.trim() || null,
            medicalVerified: verified,
          })
        }
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Section: Competency card
// ---------------------------------------------------------------------------

function CompetencySection({
  value,
  saving,
  onSave,
}: {
  value: CompetencyCard | null;
  saving: boolean;
  onSave: (v: Partial<CompetencyCard>) => void;
}) {
  const [cardType, setCardType] = useState(value?.cardType ?? "");
  const [cardNumber, setCardNumber] = useState(value?.cardNumber ?? "");
  const [expiryDate, setExpiryDate] = useState(value?.expiryDate ?? "");
  const [cardImageUrl, setCardImageUrl] = useState(value?.cardImageUrl ?? "");

  useEffect(() => {
    setCardType(value?.cardType ?? "");
    setCardNumber(value?.cardNumber ?? "");
    setExpiryDate(value?.expiryDate ?? "");
    setCardImageUrl(value?.cardImageUrl ?? "");
  }, [value]);

  return (
    <Section title="Competency card" icon={<CreditCard className="w-5 h-5" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Card type">
          <Input value={cardType} onChange={setCardType} placeholder="e.g. CSCS Blue Skilled" />
        </Field>
        <Field label="Card number">
          <Input value={cardNumber} onChange={setCardNumber} placeholder="Registration number" />
        </Field>
        <Field label="Expiry date">
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={expiryDate ?? ""}
            onChange={(e) => setExpiryDate(e.target.value || null as unknown as string)}
          />
        </Field>
        <Field label="Card image URL">
          <Input value={cardImageUrl} onChange={setCardImageUrl} placeholder="https://…" />
        </Field>
      </div>
      <SaveRow
        saving={saving}
        onClick={() =>
          onSave({
            cardType: cardType.trim() || null,
            cardNumber: cardNumber.trim() || null,
            expiryDate: expiryDate?.trim() || null,
            cardImageUrl: cardImageUrl.trim() || null,
          })
        }
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Section: Declarations
// ---------------------------------------------------------------------------

function DeclarationsSection({
  value,
  saving,
  onSave,
}: {
  value: Declarations | null;
  saving: boolean;
  onSave: (v: Partial<Declarations>) => void;
}) {
  const [operativeAccepted, setOperativeAccepted] = useState(!!value?.operativeDeclarationAccepted);
  const [supervisorAccepted, setSupervisorAccepted] = useState(!!value?.supervisorDeclarationAccepted);
  const [signatureUrl, setSignatureUrl] = useState(value?.operativeSignatureUrl ?? "");
  const [notes, setNotes] = useState(value?.notes ?? "");

  useEffect(() => {
    setOperativeAccepted(!!value?.operativeDeclarationAccepted);
    setSupervisorAccepted(!!value?.supervisorDeclarationAccepted);
    setSignatureUrl(value?.operativeSignatureUrl ?? "");
    setNotes(value?.notes ?? "");
  }, [value]);

  return (
    <Section title="Declarations" icon={<FileSignature className="w-5 h-5" />}>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={operativeAccepted} onChange={(e) => setOperativeAccepted(e.target.checked)} />
          <span>Operative accepted the declaration</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={supervisorAccepted} onChange={(e) => setSupervisorAccepted(e.target.checked)} />
          <span>Supervisor countersigned</span>
        </label>
      </div>
      <Field label="Signature URL (optional)">
        <Input value={signatureUrl} onChange={setSignatureUrl} placeholder="https://…" />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={setNotes} rows={2} />
      </Field>
      <SaveRow
        saving={saving}
        onClick={() =>
          onSave({
            operativeDeclarationAccepted: operativeAccepted,
            supervisorDeclarationAccepted: supervisorAccepted,
            operativeSignatureUrl: signatureUrl.trim() || null,
            notes: notes.trim() || null,
          })
        }
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-900">
        <span className="text-slate-600">{icon}</span>
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    />
  );
}

function TriState({
  value,
  onChange,
  labels,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  labels: { yes: string; no: string; unset: string };
}) {
  return (
    <div className="flex items-center gap-2">
      {(
        [
          [true, labels.yes],
          [false, labels.no],
          [null, labels.unset],
        ] as [boolean | null, string][]
      ).map(([v, l]) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            value === v
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function SaveRow({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        disabled={saving}
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
