/**
 * Pre-Induction Profile data model types (stored in Supabase; paths in DATA_MODEL.md are historical).
 */

export type PreInductionStatus = "not_started" | "in_progress" | "complete";

/** User document fields (additions only) */
export interface UserPreInductionFields {
  preInductionStatus?: PreInductionStatus;
  adminPreInductionOverride?: boolean;
  complianceScore?: number; // 0–100, optional
}

/** Section IDs for preInductionProfile subcollection */
export type PreInductionSectionId =
  | "personal"
  | "rightToWork"
  | "certifications"
  | "medical"
  | "training"
  | "declarations";

/** Date, ISO-ish string, or SDK object with `toDate()` (e.g. from mobile clients). */
export type FlexibleTimestamp = { toDate: () => Date } | Date | null;

// --- Section documents ---

export interface PreInductionPersonal {
  fullName: string;
  dateOfBirth: string | FlexibleTimestamp;
  nationalInsuranceNumber: string;
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  employerCompanyId: string;
  supervisorName: string;
  trade: string;
  jobRole: string;
  utrNumber?: string;
  payrollNumber?: string;
  updatedAt: FlexibleTimestamp;
}

export interface PreInductionRightToWork {
  passportUrl: string | null;
  passportExpiry: FlexibleTimestamp;
  visaUrl: string | null;
  visaExpiry: FlexibleTimestamp;
  shareCode: string | null;
  proofOfAddressUrl: string | null;
  rightToWorkVerified: boolean;
  rightToWorkVerifiedBy: string | null; // admin uid
  rightToWorkVerifiedAt: FlexibleTimestamp;
  notes: string | null;
  updatedAt: FlexibleTimestamp;
}

export type CertificationType =
  | "CSCS"
  | "CPCS"
  | "IPAF"
  | "PASMA"
  | "FIRST_AID"
  | "MANUAL_HANDLING"
  | "ASBESTOS"
  | "FIRE_MARSHAL"
  | "SMSTS"
  | "SSSTS"
  | "CONFINED_SPACES"
  | string;

export interface PreInductionCertificationItem {
  type: CertificationType;
  cardNumber: string | null;
  fileUrl: string | null;
  expiry: FlexibleTimestamp;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: FlexibleTimestamp;
  notes: string | null;
}

export interface PreInductionCertifications {
  certifications: PreInductionCertificationItem[];
  updatedAt: FlexibleTimestamp;
}

export interface PreInductionMedical {
  medicalDeclaration: string | null;
  fitToWork: boolean | null;
  allergies: string | null;
  medication: string | null;
  medicalCertificateUrl: string | null;
  medicalVerified: boolean;
  medicalVerifiedBy: string | null;
  medicalVerifiedAt: FlexibleTimestamp;
  notes: string | null;
  updatedAt: FlexibleTimestamp;
}

export interface PreInductionTrainingRecord {
  type: string;
  completedAt: FlexibleTimestamp;
  expiry: FlexibleTimestamp;
  fileUrl: string | null;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: FlexibleTimestamp;
  notes: string | null;
}

export interface PreInductionTraining {
  trainingRecords: PreInductionTrainingRecord[];
  ramsAccepted: boolean;
  ramsAcceptedAt: FlexibleTimestamp;
  ramsVersion: string | null;
  updatedAt: FlexibleTimestamp;
}

export interface PreInductionDeclarations {
  operativeDeclarationAccepted: boolean;
  operativeDeclarationAcceptedAt: FlexibleTimestamp;
  operativeSignatureUrl: string | null;
  supervisorDeclarationAccepted: boolean | null;
  supervisorDeclarationAcceptedAt: FlexibleTimestamp;
  notes: string | null;
  updatedAt: FlexibleTimestamp;
}

/** Union of all section document types */
export type PreInductionSectionDoc =
  | PreInductionPersonal
  | PreInductionRightToWork
  | PreInductionCertifications
  | PreInductionMedical
  | PreInductionTraining
  | PreInductionDeclarations;

// --- Site Induction additions ---

/** Additional fields for users/{uid}/siteInductions/{siteId} */
export interface SiteInductionGrandfatherFields {
  grandfathered?: boolean;
  preInductionRequiredAt?: FlexibleTimestamp;
}
