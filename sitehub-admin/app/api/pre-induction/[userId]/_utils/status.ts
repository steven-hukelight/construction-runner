import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function updatePreInductionStatus(userId: string): Promise<void> {
  const [personalRes, rightToWorkRes, competencyRes, medicalRes, trainingRes, declarationsRes] = await Promise.all([
    supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_competency_card").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const personal = personalRes.data as Record<string, unknown> | null;
  const rightToWork = rightToWorkRes.data as Record<string, unknown> | null;
  const competencyCardData = competencyRes.data as Record<string, unknown> | null;
  const medical = medicalRes.data as Record<string, unknown> | null;
  const training = trainingRes.data as Record<string, unknown> | null;
  const declarations = declarationsRes.data as Record<string, unknown> | null;

  const personalComplete = !!(personal && Object.keys(personal).length > 0 && (personal.full_name || personal.email));
  const rightToWorkComplete = !!(rightToWork && Object.keys(rightToWork).length > 0) && (rightToWork.right_to_work_verified ?? rightToWork.rightToWorkVerified) === true;
  const competencyCardComplete = !!(competencyCardData && Object.keys(competencyCardData).length > 0 && (competencyCardData.card_number ?? competencyCardData.cardNumber ?? competencyCardData.file_url ?? competencyCardData.fileUrl));
  const medicalComplete = !!(medical && Object.keys(medical).length > 0) && (medical.medical_verified ?? medical.medicalVerified) === true;
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
  }).eq("id", userId);
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
  const rtw = rightToWork?.right_to_work_verified ?? rightToWork?.rightToWorkVerified;
  const med = medical?.medical_verified ?? medical?.medicalVerified;

  if (rtw === true) score += 30;
  if (med === true) score += 20;

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

function isExpired(exp: unknown): boolean {
  if (!exp) return false;
  let date: Date | null = null;
  if (typeof (exp as { toDate?: () => Date }).toDate === "function") {
    date = (exp as { toDate: () => Date }).toDate();
  } else if (exp instanceof Date) {
    date = exp;
  } else if (typeof exp === "string") {
    date = new Date(exp);
  }
  return date ? date.getTime() < Date.now() : false;
}

export function getMissingSections(
  sectionData: Array<Record<string, unknown> | undefined>
): Record<string, boolean> {
  const [personal, rightToWork, competencyCard, medical, _training, declarations] = sectionData;
  const personalExists = !!personal && Object.keys(personal).length > 0 && (personal.full_name || personal.email);
  const rtwVerified = !!rightToWork && Object.keys(rightToWork).length > 0 && (rightToWork.right_to_work_verified ?? rightToWork.rightToWorkVerified) === true;
  const competencyOk = !!(competencyCard && (competencyCard.card_number ?? competencyCard.cardNumber ?? competencyCard.file_url ?? competencyCard.fileUrl));
  const medicalVerified = !!medical && Object.keys(medical).length > 0 && (medical.medical_verified ?? medical.medicalVerified) === true;
  const declAccepted = !!declarations && Object.keys(declarations).length > 0 && (declarations.operative_declaration_accepted ?? declarations.operativeDeclarationAccepted) === true;

  return {
    personal: !personalExists,
    rightToWork: !rtwVerified,
    certifications: false,
    competencyCard: !competencyOk,
    medical: !medicalVerified,
    training: false,
    declarations: !declAccepted,
  };
}
