"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import { readError, type CatalogueModule } from "./types";

const QUESTION_COUNT = 5;

type DraftQuestion = { stem: string; options: [string, string, string]; correctIndex: number };

function blankQuestion(): DraftQuestion {
  return { stem: "", options: ["", "", ""], correctIndex: 0 };
}

function padded(questions: DraftQuestion[]): DraftQuestion[] {
  const out = questions.slice(0, QUESTION_COUNT);
  while (out.length < QUESTION_COUNT) out.push(blankQuestion());
  return out;
}

export default function QuestionsEditor({
  module: m,
  canConfigure,
  onClose,
  onSaved,
}: {
  module: CatalogueModule;
  canConfigure: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [questions, setQuestions] = useState<DraftQuestion[] | null>(null);
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/training-admin/modules/${m.id}/questions`, { credentials: "include" });
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(await readError(res, "Couldn't load the questions"));
        return;
      }
      const json = (await res.json()) as {
        custom: boolean;
        questions: { stem: string; options: string[]; correctIndex: number }[];
      };
      setCustom(json.custom);
      setQuestions(
        padded(
          json.questions.map((q) => ({
            stem: q.stem,
            options: [q.options[0] ?? "", q.options[1] ?? "", q.options[2] ?? ""],
            correctIndex: q.correctIndex,
          })),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [m.id]);

  function update(index: number, change: Partial<DraftQuestion>) {
    setQuestions((current) => current?.map((q, i) => (i === index ? { ...q, ...change } : q)) ?? current);
  }

  async function save() {
    if (!questions) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/training-admin/modules/${m.id}/questions`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't save the questions"));
        return;
      }
      toast.success("Questions saved");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function useStandard() {
    if (!window.confirm(`Go back to the standard questions for ${m.title}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/training-admin/modules/${m.id}/questions`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        toast.error(await readError(res, "Couldn't reset the questions"));
        return;
      }
      toast.success("Using the standard questions");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-red-600">{loadError}</p>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }
  if (!questions) return <p className="text-sm text-slate-500">Loading questions…</p>;

  const readOnly = !canConfigure;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Questions for {m.title}</p>
        <p className="text-xs text-slate-500">
          {m.ownModule
            ? "Five questions, three answers each. Four right is a pass."
            : custom
              ? "Your company's own questions. Your people get these instead of the standard ones. Four right is a pass."
              : "These are the standard questions. Change any of them and save to use your own instead. Four right is a pass."}{" "}
          Questions and answers are shuffled for each attempt.
        </p>
      </div>
      <ol className="space-y-4">
        {questions.map((q, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
            <label className="block text-xs font-medium text-slate-600">
              Question {i + 1}
              <textarea
                value={q.stem}
                disabled={readOnly || saving}
                maxLength={300}
                rows={2}
                onChange={(e) => update(i, { stem: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900"
              />
            </label>
            <div className="mt-2 space-y-1">
              {q.options.map((option, oi) => (
                <label key={oi} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`correct-${m.id}-${i}`}
                    checked={q.correctIndex === oi}
                    disabled={readOnly || saving}
                    onChange={() => update(i, { correctIndex: oi })}
                    aria-label={`Answer ${oi + 1} is right`}
                  />
                  <input
                    type="text"
                    value={option}
                    disabled={readOnly || saving}
                    maxLength={150}
                    placeholder={`Answer ${oi + 1}`}
                    onChange={(e) => {
                      const options = [...q.options] as [string, string, string];
                      options[oi] = e.target.value;
                      update(i, { options });
                    }}
                    className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900"
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-400">Tick the right answer.</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {canConfigure && (
          <Button size="sm" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save questions"}
          </Button>
        )}
        {canConfigure && custom && !m.ownModule && (
          <Button size="sm" variant="secondary" disabled={saving} onClick={useStandard}>
            Use the standard questions
          </Button>
        )}
        <Button size="sm" variant="secondary" disabled={saving} onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
