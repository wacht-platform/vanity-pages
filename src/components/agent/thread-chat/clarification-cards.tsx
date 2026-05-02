"use client";

import * as React from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type {
    AnswerSubmission,
    AnswerValue,
    ClarificationRequestContent,
    ClarificationResponseContent,
    Question,
    QuestionAnswer,
} from "@wacht/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClarificationRequestCard({
    content,
    isActive,
    submitting,
    onSubmit,
    response,
    expired,
}: {
    content: ClarificationRequestContent;
    isActive: boolean;
    submitting: boolean;
    onSubmit: (submission: AnswerSubmission) => Promise<void>;
    response?: ClarificationResponseContent;
    expired?: boolean;
}) {
    const [draft, setDraft] = React.useState<Record<string, AnswerValue | undefined>>({});
    const [error, setError] = React.useState<string | null>(null);
    const [expanded, setExpanded] = React.useState(false);

    if (!response && expired) {
        return (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex w-full items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                    {expanded ? (
                        <IconChevronDown size={12} />
                    ) : (
                        <IconChevronRight size={12} />
                    )}
                    <span>
                        Question expired ({content.questions.length}{" "}
                        {content.questions.length === 1 ? "question" : "questions"})
                        — superseded by a follow-up message
                    </span>
                </button>
                {expanded ? (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {content.questions.map((q) => (
                            <li key={q.id}>{q.text}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    if (response) {
        const answersById = new Map(response.answers.map((a) => [a.question_id, a.value]));
        return (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex w-full items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                    {expanded ? (
                        <IconChevronDown size={12} />
                    ) : (
                        <IconChevronRight size={12} />
                    )}
                    <span>
                        Answered {content.questions.length}{" "}
                        {content.questions.length === 1 ? "question" : "questions"}
                    </span>
                </button>
                <ul className="mt-2 space-y-2 text-sm">
                    {content.questions.map((q) => {
                        const a = answersById.get(q.id);
                        return (
                            <li key={q.id} className="space-y-0.5">
                                {expanded ? (
                                    <div className="text-xs text-muted-foreground">
                                        {q.text}
                                    </div>
                                ) : null}
                                <div>{a ? formatAnswerValue(a) : "—"}</div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    const setAnswer = (id: string, value: AnswerValue) => {
        setDraft((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async () => {
        const answers: QuestionAnswer[] = [];
        for (const q of content.questions) {
            const value = draft[q.id];
            if (value === undefined) {
                setError(`Answer required for: ${q.text}`);
                return;
            }
            answers.push({ question_id: q.id, value });
        }
        setError(null);
        try {
            await onSubmit({ answers });
            setDraft({});
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit");
        }
    };

    return (
        <div className="space-y-4 rounded-lg border border-border/60 bg-accent/10 p-4">
            <div className="space-y-1">
                <div className="text-sm font-medium">The agent is asking for input</div>
                {content.context ? (
                    <div className="text-sm text-muted-foreground">{content.context}</div>
                ) : null}
            </div>
            <div className="space-y-4">
                {content.questions.map((q) => (
                    <QuestionField
                        key={q.id}
                        question={q}
                        value={draft[q.id]}
                        disabled={!isActive || submitting}
                        onChange={(v) => setAnswer(q.id, v)}
                    />
                ))}
            </div>
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            {isActive ? (
                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Submitting…" : "Submit"}
                    </Button>
                </div>
            ) : (
                <div className="text-xs text-muted-foreground">
                    A newer message has been sent; this question is no longer active.
                </div>
            )}
        </div>
    );
}

function formatAnswerValue(value: AnswerValue): string {
    switch (value.kind) {
        case "free_text":
        case "single_choice":
        case "date":
            return value.value;
        case "multi_choice":
            return value.values.join(", ");
        case "yes_no":
            return value.value ? "Yes" : "No";
        case "number":
            return String(value.value);
        case "confirm":
            return value.accepted ? "Confirmed" : "Cancelled";
    }
}

function QuestionField({
    question,
    value,
    disabled,
    onChange,
}: {
    question: Question;
    value: AnswerValue | undefined;
    disabled: boolean;
    onChange: (v: AnswerValue) => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">{question.text}</Label>
            <AnswerInput
                kind={question.answer_kind}
                value={value}
                disabled={disabled}
                onChange={onChange}
            />
        </div>
    );
}

function AnswerInput({
    kind,
    value,
    disabled,
    onChange,
}: {
    kind: Question["answer_kind"];
    value: AnswerValue | undefined;
    disabled: boolean;
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
                    disabled={disabled}
                    onChange={(e) => onChange({ kind: "free_text", value: e.target.value })}
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
                                disabled={disabled}
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
                                disabled={disabled}
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
                        disabled={disabled}
                        onClick={() => onChange({ kind: "yes_no", value: true })}
                    >
                        Yes
                    </Button>
                    <Button
                        type="button"
                        variant={current === false ? "default" : "outline"}
                        size="sm"
                        disabled={disabled}
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
                        disabled={disabled}
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
                    disabled={disabled}
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
                        disabled={disabled}
                        onClick={() => onChange({ kind: "confirm", accepted: true })}
                    >
                        {kind.confirm_label}
                    </Button>
                    <Button
                        type="button"
                        variant={current === false ? "destructive" : "outline"}
                        size="sm"
                        disabled={disabled}
                        onClick={() => onChange({ kind: "confirm", accepted: false })}
                    >
                        {kind.cancel_label}
                    </Button>
                </div>
            );
        }
    }
}
