/**
 * Pre-Induction Profile data model types.
 * Firestore: users/{uid}/preInductionProfile/{sectionId}
 * See DATA_MODEL.md for full schema.
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

/** Firestore Timestamp type (server); Date on client */
export type FirestoreTimestamp = { toDate: () => Date } | Date | null;

// --- Section documents ---

export interface PreInductionPersonal {
  fullName: string;
  dateOfBirth: string | FirestoreTimestamp;
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
  updatedAt: FirestoreTimestamp;
}

export interface PreInductionRightToWork {
  passportUrl: string | null;
  passportExpiry: FirestoreTimestamp;
  visaUrl: string | null;
  visaExpiry: FirestoreTimestamp;
  shareCode: string | null;
  proofOfAddressUrl: string | null;
  rightToWorkVerified: boolean;
  rightToWorkVerifiedBy: string | null; // admin uid
  rightToWorkVerifiedAt: FirestoreTimestamp;
  notes: string | null;
  updatedAt: FirestoreTimestamp;
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
  expiry: FirestoreTimestamp;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: FirestoreTimestamp;
  notes: string | null;
}

export interface PreInductionCertifications {
  certifications: PreInductionCertificationItem[];
  updatedAt: FirestoreTimestamp;
}

export interface PreInductionMedical {
  medicalDeclaration: string | null;
  fitToWork: boolean | null;
  allergies: string | null;
  medication: string | null;
  medicalCertificateUrl: string | null;
  medicalVerified: boolean;
  medicalVerifiedBy: string | null;
  medicalVerifiedAt: FirestoreTimestamp;
  notes: string | null;
  updatedAt: FirestoreTimestamp;
}

export interface PreInductionTrainingRecord {
  type: string;
  completedAt: FirestoreTimestamp;
  expiry: FirestoreTimestamp;
  fileUrl: string | null;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: FirestoreTimestamp;
  notes: string | null;
}

export interface PreInductionTraining {
  trainingRecords: PreInductionTrainingRecord[];
  ramsAccepted: boolean;
  ramsAcceptedAt: FirestoreTimestamp;
  ramsVersion: string | null;
  updatedAt: FirestoreTimestamp;
}

export interface PreInductionDeclarations {
  operativeDeclarationAccepted: boolean;
  operativeDeclarationAcceptedAt: FirestoreTimestamp;
  operativeSignatureUrl: string | null;
  supervisorDeclarationAccepted: boolean | null;
  supervisorDeclarationAcceptedAt: FirestoreTimestamp;
  notes: string | null;
  updatedAt: FirestoreTimestamp;
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
  preInductionRequiredAt?: FirestoreTimestamp;
}
