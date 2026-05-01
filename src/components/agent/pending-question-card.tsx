"use client";

import * as React from "react";
import type {
    AnswerKind,
    AnswerSubmission,
    AnswerValue,
    PendingQuestion,
    Question,
    QuestionAnswer,
} from "@wacht/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
    pending: PendingQuestion;
    onSubmit: (submission: AnswerSubmission) => Promise<unknown>;
    busy?: boolean;
};

export function PendingQuestionCard({ pending, onSubmit, busy }: Props) {
    const [draft, setDraft] = React.useState<Record<string, AnswerValue | undefined>>({});
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    const setAnswer = (id: string, value: AnswerValue) => {
        setDraft((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async () => {
        const answers: QuestionAnswer[] = [];
        for (const q of pending.questions) {
            const value = draft[q.id];
            if (value === undefined) {
                setError(`Answer required for: ${q.text}`);
                return;
            }
            answers.push({ question_id: q.id, value });
        }
        setError(null);
        setSubmitting(true);
        try {
            await onSubmit({ answers });
            setDraft({});
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 rounded-lg border border-border/60 bg-accent/10 p-4">
            <div className="space-y-1">
                <div className="text-sm font-medium">The agent is asking for your input</div>
                {pending.context ? (
                    <div className="text-sm text-muted-foreground">{pending.context}</div>
                ) : null}
            </div>
            <div className="space-y-4">
                {pending.questions.map((q) => (
                    <QuestionField
                        key={q.id}
                        question={q}
                        value={draft[q.id]}
                        onChange={(v) => setAnswer(q.id, v)}
                    />
                ))}
            </div>
            {error ? (
                <div className="text-sm text-destructive">{error}</div>
            ) : null}
            <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={busy || submitting}>
                    {submitting ? "Submitting…" : "Submit"}
                </Button>
            </div>
        </div>
    );
}

function QuestionField({
    question,
    value,
    onChange,
}: {
    question: Question;
    value: AnswerValue | undefined;
    onChange: (v: AnswerValue) => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">{question.text}</Label>
            <AnswerInput kind={question.answer_kind} value={value} onChange={onChange} />
        </div>
    );
}

function AnswerInput({
    kind,
    value,
    onChange,
}: {
    kind: AnswerKind;
    value: AnswerValue | undefined;
    onChange: (v: AnswerValue) => void;
}) {
    switch (kind.kind) {
        case "free_text": {
            const current = value?.kind === "free_text" ? value.value : "";
            return (
                <Input
                    placeholder={kind.placeholder}
                    maxLength={kind.max_length}
                    value={current}
                    onChange={(e) =>
                        onChange({ kind: "free_text", value: e.target.value })
                    }
                />
            );
        }
        case "single_choice": {
            const current = value?.kind === "single_choice" ? value.value : "";
            return (
                <div className="space-y-1.5">
                    {kind.choices.map((c) => (
                        <label key={c.value} className="flex items-start gap-2 text-sm">
                            <input
                                type="radio"
                                className="mt-0.5"
                                name={`q-${c.value}`}
                                checked={current === c.value}
                                onChange={() =>
                                    onChange({ kind: "single_choice", value: c.value })
                                }
                            />
                            <span>
                                <span className="font-medium">{c.label}</span>
                                {c.description ? (
                                    <span className="block text-xs text-muted-foreground">
                                        {c.description}
                                    </span>
                                ) : null}
                            </span>
                        </label>
                    ))}
                </div>
            );
        }
        case "multi_choice": {
            const current = value?.kind === "multi_choice" ? value.values : [];
            const toggle = (v: string) => {
                const next = current.includes(v)
                    ? current.filter((x) => x !== v)
                    : [...current, v];
                onChange({ kind: "multi_choice", values: next });
            };
            return (
                <div className="space-y-1.5">
                    {kind.choices.map((c) => (
                        <label key={c.value} className="flex items-start gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={current.includes(c.value)}
                                onChange={() => toggle(c.value)}
                            />
                            <span>
                                <span className="font-medium">{c.label}</span>
                                {c.description ? (
                                    <span className="block text-xs text-muted-foreground">
                                        {c.description}
                                    </span>
                                ) : null}
                            </span>
                        </label>
                    ))}
                </div>
            );
        }
        case "yes_no": {
            const current = value?.kind === "yes_no" ? value.value : undefined;
            return (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={current === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => onChange({ kind: "yes_no", value: true })}
                    >
                        Yes
                    </Button>
                    <Button
                        type="button"
                        variant={current === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => onChange({ kind: "yes_no", value: false })}
                    >
                        No
                    </Button>
                </div>
            );
        }
        case "number": {
            const current = value?.kind === "number" ? String(value.value) : "";
            return (
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={kind.min}
                        max={kind.max}
                        value={current}
                        onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                                onChange({ kind: "number", value: v });
                            }
                        }}
                    />
                    {kind.unit ? (
                        <span className="text-sm text-muted-foreground">{kind.unit}</span>
                    ) : null}
                </div>
            );
        }
        case "date": {
            const current = value?.kind === "date" ? value.value : "";
            return (
                <Input
                    type="date"
                    min={kind.min_date}
                    max={kind.max_date}
                    value={current}
                    onChange={(e) => onChange({ kind: "date", value: e.target.value })}
                />
            );
        }
        case "confirm": {
            const current = value?.kind === "confirm" ? value.accepted : undefined;
            return (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={current === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => onChange({ kind: "confirm", accepted: true })}
                    >
                        {kind.confirm_label}
                    </Button>
                    <Button
                        type="button"
                        variant={current === false ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => onChange({ kind: "confirm", accepted: false })}
                    >
                        {kind.cancel_label}
                    </Button>
                </div>
            );
        }
    }
}
