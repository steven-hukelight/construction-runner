import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth, type TrainingOfficeAuth } from "@/lib/training/officeAuth";
import { loadCompanyQuestions, loadModule, loadQuestions, type TrainingModuleRow } from "@/lib/training/service";
import { parseCompanyQuestions } from "@/lib/training/companyModules";

type Authorised = { auth: TrainingOfficeAuth; trainingModule: TrainingModuleRow };

async function authorise(req: Request, moduleId: string, write: boolean): Promise<Authorised | NextResponse> {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (write && !auth.canConfigure) {
    return NextResponse.json({ error: "Only a Super Admin can change training questions" }, { status: 403 });
  }
  const trainingModule = await loadModule(moduleId, auth.companyId);
  if (!trainingModule || trainingModule.kind !== "video") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return { auth, trainingModule };
}

function forOffice(questions: { stem: string; options: string[]; correct_index: number }[]) {
  return questions.map((q) => ({ stem: q.stem, options: q.options, correctIndex: q.correct_index }));
}

/** The questions this company's people get, and whether they are the company's own. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await authorise(req, id, false);
    if (ok instanceof NextResponse) return ok;
    const own = await loadCompanyQuestions(id, ok.auth.companyId);
    const shared = own.length || ok.trainingModule.company_id ? [] : await loadQuestions(id);
    return NextResponse.json({
      custom: own.length > 0,
      ownModule: ok.trainingModule.company_id === ok.auth.companyId,
      questions: forOffice(own.length ? own : shared),
    });
  } catch (e) {
    console.error("GET /api/training-admin/modules/[id]/questions:", e);
    return NextResponse.json({ error: "Couldn't load the questions" }, { status: 500 });
  }
}

/** `{ questions: [{ stem, options: [a, b, c], correctIndex }] × 5 }` replaces the company's set. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await authorise(req, id, true);
    if (ok instanceof NextResponse) return ok;
    const body = (await req.json().catch(() => ({}))) as { questions?: unknown };
    const parsed = parseCompanyQuestions(body.questions);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { error: clearError } = await supabaseAdmin
      .from("company_training_questions")
      .delete()
      .eq("company_id", ok.auth.companyId)
      .eq("module_id", id);
    if (clearError) throw new Error(`company_training_questions: ${clearError.message}`);
    const { error } = await supabaseAdmin.from("company_training_questions").insert(
      parsed.map((q, i) => ({
        company_id: ok.auth.companyId,
        module_id: id,
        sort_order: i + 1,
        stem: q.stem,
        options: q.options,
        correct_index: q.correctIndex,
        created_by: ok.auth.uid,
      })),
    );
    if (error) {
      console.error("PUT /api/training-admin/modules/[id]/questions:", error);
      return NextResponse.json({ error: "Couldn't save the questions" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/training-admin/modules/[id]/questions:", e);
    return NextResponse.json({ error: "Couldn't save the questions" }, { status: 500 });
  }
}

/** Goes back to the shared questions. Not available on the company's own modules. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await authorise(req, id, true);
    if (ok instanceof NextResponse) return ok;
    if (ok.trainingModule.company_id) {
      return NextResponse.json({ error: "Your own module needs its questions" }, { status: 409 });
    }
    const { error } = await supabaseAdmin
      .from("company_training_questions")
      .delete()
      .eq("company_id", ok.auth.companyId)
      .eq("module_id", id);
    if (error) {
      console.error("DELETE /api/training-admin/modules/[id]/questions:", error);
      return NextResponse.json({ error: "Couldn't reset the questions" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/training-admin/modules/[id]/questions:", e);
    return NextResponse.json({ error: "Couldn't reset the questions" }, { status: 500 });
  }
}
