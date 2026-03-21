import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function resolveUser(userIdOrEmail: string) {
  const { data: byId } = await supabaseAdmin.from("users").select("*").eq("id", userIdOrEmail).maybeSingle();
  if (byId) return byId as Record<string, unknown>;
  const { data: byEmail } = await supabaseAdmin.from("users").select("*").eq("email", userIdOrEmail).maybeSingle();
  return byEmail as Record<string, unknown> | null;
}

function isTruthyYes(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "yes" || v === "y" || v === "1";
  }
  return false;
}

/** Required for completion: Personal, Right to Work (documents), Competency Card, Medical, Declaration. Certification & Training are optional. */
export async function updatePreInductionStatus(userId: string): Promise<void> {
  const userRow = await resolveUser(userId);
  if (!userRow) return;
  const actualUserId = (userRow.id as string) ?? userId;

  async function fetchSection(table: string) {
    const res = await supabaseAdmin.from(table).select("*").eq("user_id", actualUserId).maybeSingle();
    return res;
  }

  const [personalRes, rightToWorkRes, competencyRes, medicalRes, trainingRes, declarationsRes] = await Promise.all([
    fetchSection("pre_induction_personal"),
    fetchSection("pre_induction_right_to_work"),
    fetchSection("pre_induction_competency_card"),
    fetchSection("pre_induction_medical"),
    fetchSection("pre_induction_training"),
    fetchSection("pre_induction_declarations"),
  ]);

  if (process.env.NODE_ENV !== "production" && (userId.includes("sh.light83") || actualUserId === "8e5a0e26-1ad7-43d5-b89b-391c07328845")) {
    console.log("[TRACE pre-induction rows status]", {
      userId,
      actualUserId,
      personal: personalRes,
      rtw: rightToWorkRes,
      competency: competencyRes,
      medical: medicalRes,
      training: trainingRes,
      declarations: declarationsRes,
    });
  }

  const personal = personalRes.data as Record<string, unknown> | null;
  const rightToWork = rightToWorkRes.data as Record<string, unknown> | null;
  const competencyCardData = competencyRes.data as Record<string, unknown> | null;
  const medical = medicalRes.data as Record<string, unknown> | null;
  const training = trainingRes.data as Record<string, unknown> | null;
  const declarations = declarationsRes.data as Record<string, unknown> | null;

  const personalComplete = !!(personal && Object.keys(personal).length > 0 && (personal.full_name || personal.email));
  // Right to Work: (passport OR visa) AND proof_of_address required; OR admin verified
  const rtwHasId = !!(rightToWork && (rightToWork.passport_url ?? rightToWork.passportUrl ?? rightToWork.visa_url ?? rightToWork.visaUrl));
  const rtwHasProof = !!(rightToWork && (rightToWork.proof_of_address_url ?? rightToWork.proofOfAddressUrl));
  const rtwVerified = rightToWork?.right_to_work_verified ?? rightToWork?.rightToWorkVerified;
  const rightToWorkComplete = !!(rightToWork && Object.keys(rightToWork).length > 0 && (rtwVerified === true || (rtwHasId && rtwHasProof)));
  // Competency Card: BOTH document AND card details (number) required
  const ccHasDoc = !!(competencyCardData?.file_url ?? competencyCardData?.fileUrl);
  const ccNum = ((competencyCardData?.card_number ?? competencyCardData?.cardNumber) ?? "").toString().trim();
  const ccHasDetails = ccNum.length > 0;
  const competencyCardComplete = !!(competencyCardData && Object.keys(competencyCardData).length > 0 && ccHasDoc && ccHasDetails);
  // Medical: no issues (has_medical_issues=false OR fit_to_work=true) = complete; else need cert or verified
  const medHasIssues = medical?.has_medical_issues ?? medical?.hasMedicalIssues;
  const medFitToWork = medical?.fit_to_work ?? medical?.fitToWork;
  const medNoIssues = medHasIssues === false || isTruthyYes(medFitToWork);
  const medHasCert = !!(medical?.medical_certificate_url ?? medical?.medicalCertificateUrl);
  const medVerified = medical?.medical_verified ?? medical?.medicalVerified;
  const medicalComplete = !!(medical && Object.keys(medical).length > 0 && (medVerified === true || medNoIssues || medHasCert));
  const declarationsComplete = !!(declarations && Object.keys(declarations).length > 0) && (declarations.operative_declaration_accepted ?? declarations.operativeDeclarationAccepted) === true;

  const allRequired = personalComplete && rightToWorkComplete && competencyCardComplete && medicalComplete && declarationsComplete;

  const hasAny = !!(personalRes.data || rightToWorkRes.data || competencyRes.data || medicalRes.data || trainingRes.data || declarationsRes.data);

  let status: "not_started" | "in_progress" | "complete" = "not_started";
  if (allRequired) status = "complete";
  else if (hasAny) status = "in_progress";

  const complianceScore = computeComplianceScore({
    rightToWork,
    competencyCard: competencyCardData,
    medical,
    training,
    declarations,
  });

  await supabaseAdmin.from("users").update({
    pre_induction_status: status,
    compliance_score: complianceScore,
  }).eq("id", actualUserId);
}

function computeComplianceScore(params: {
  rightToWork?: Record<string, unknown> | null;
  competencyCard?: Record<string, unknown> | null;
  medical?: Record<string, unknown> | null;
  training?: Record<string, unknown> | null;
  declarations?: Record<string, unknown> | null;
}): number {
  let score = 0;
  const { rightToWork, competencyCard, medical, training, declarations } = params;
  const rtwVerified = rightToWork?.right_to_work_verified ?? rightToWork?.rightToWorkVerified;
  const rtwHasId = !!(rightToWork && (rightToWork.passport_url ?? rightToWork.passportUrl ?? rightToWork.visa_url ?? rightToWork.visaUrl));
  const rtwHasProof = !!(rightToWork && (rightToWork.proof_of_address_url ?? rightToWork.proofOfAddressUrl));
  const rtwComplete = rtwVerified === true || (rtwHasId && rtwHasProof);

  const medVerified = medical?.medical_verified ?? medical?.medicalVerified;
  const medHasIssues = medical?.has_medical_issues ?? medical?.hasMedicalIssues;
  const medFitToWork = medical?.fit_to_work ?? medical?.fitToWork;
  const medNoIssues = medHasIssues === false || isTruthyYes(medFitToWork);
  const medHasCert = !!(medical?.medical_certificate_url ?? medical?.medicalCertificateUrl);
  const medComplete = medVerified === true || medNoIssues || medHasCert;

  if (rtwComplete) score += 30;
  if (medComplete) score += 20;

  const hasCompetencyCard = !!(competencyCard && (competencyCard.card_number ?? competencyCard.cardNumber ?? competencyCard.file_url ?? competencyCard.fileUrl));
  if (hasCompetencyCard) score += 20;

  const decl = declarations?.operative_declaration_accepted ?? declarations?.operativeDeclarationAccepted;
  if (decl === true) score += 10;

  const ramsRequired = training?.rams_required_version ?? training?.ramsRequiredVersion ?? (training?.rams_required_version_by_site && Object.keys((training.rams_required_version_by_site as Record<string, string>) ?? {}).length > 0);
  if (ramsRequired) {
    const accepted = training?.rams_accepted ?? training?.ramsAccepted === true;
    const versionMatch = training?.rams_version === (training?.rams_required_version ?? training?.ramsVersion);
    if (accepted && versionMatch) score += 10;
    else if (accepted && !versionMatch) score -= 10;
    else score -= 20;
  }

  return Math.min(100, Math.max(0, score));
}

export function getMissingSections(
  sectionData: Array<Record<string, unknown> | undefined>
): Record<string, boolean> {
  const [personal, rightToWork, competencyCard, medical, , declarations] = sectionData;
  const personalExists = !!personal && Object.keys(personal).length > 0 && (personal.full_name || personal.email);

  // Right to Work is considered present when verified OR the required documents are uploaded
  const rtwHasId = !!(rightToWork && (rightToWork.passport_url ?? rightToWork.passportUrl ?? rightToWork.visa_url ?? rightToWork.visaUrl));
  const rtwHasProof = !!(rightToWork && (rightToWork.proof_of_address_url ?? rightToWork.proofOfAddressUrl));
  const rtwVerified = !!rightToWork && Object.keys(rightToWork).length > 0 && (rightToWork.right_to_work_verified ?? rightToWork.rightToWorkVerified) === true;
  const rightToWorkComplete = rtwVerified || (rtwHasId && rtwHasProof);

  const competencyOk = !!(competencyCard && (competencyCard.card_number ?? competencyCard.cardNumber ?? competencyCard.file_url ?? competencyCard.fileUrl));

  // Medical: no issues (has_medical_issues=false OR fit_to_work=true) = complete; else need cert or verified
  const medHasIssues = medical?.has_medical_issues ?? medical?.hasMedicalIssues;
  const medFitToWork = medical?.fit_to_work ?? medical?.fitToWork;
  const medNoIssues = medHasIssues === false || isTruthyYes(medFitToWork);
  const medHasCert = !!(medical?.medical_certificate_url ?? medical?.medicalCertificateUrl);
  const medicalVerified = !!medical && Object.keys(medical).length > 0 && (medical.medical_verified ?? medical.medicalVerified) === true;
  const medicalComplete = medicalVerified || medNoIssues || medHasCert;

  const declAccepted = !!declarations && Object.keys(declarations).length > 0 && (declarations.operative_declaration_accepted ?? declarations.operativeDeclarationAccepted) === true;

  return {
    personal: !personalExists,
    rightToWork: !rightToWorkComplete,
    certifications: false,
    competencyCard: !competencyOk,
    medical: !medicalComplete,
    training: false,
    declarations: !declAccepted,
  };
}
