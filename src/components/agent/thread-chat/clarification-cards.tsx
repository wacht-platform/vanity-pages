"use client";

import * as React from "react";
import {
    IconChevronDown,
    IconChevronRight,
    IconHelpCircle,
} from "@tabler/icons-react";
import type {
    AnswerSubmission,
    AnswerValue,
    ClarificationRequestContent,
    ClarificationResponseContent,
    QuestionAnswer,
} from "@wacht/types";
import { Button } from "@/components/ui/button";
import {
    FieldLabel,
    QuestionAnswerInput,
    formatAnswerValue,
} from "./question-fields";

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
    const [draft, setDraft] = React.useState<
        Record<string, AnswerValue | undefined>
    >({});
    const [error, setError] = React.useState<string | null>(null);
    const [expanded, setExpanded] = React.useState(false);
    const [freeformDraft, setFreeformDraft] = React.useState("");
    const [freeformMode, setFreeformMode] = React.useState(false);

    if (!response && expired) {
        return (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
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
                        {content.questions.length === 1
                            ? "question"
                            : "questions"}
                        ) — superseded by a follow-up message
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
        if (response.freeform_text) {
            return (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                        Replied freely (skipped the form)
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">
                        {response.freeform_text}
                    </div>
                </div>
            );
        }
        const answersById = new Map(
            (response.answers ?? []).map((a) => [a.question_id, a.value]),
        );
        return (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
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
                        {content.questions.length === 1
                            ? "question"
                            : "questions"}
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

    const handleFreeformSubmit = async () => {
        const text = freeformDraft.trim();
        if (text === "") {
            setError("Type a message before sending.");
            return;
        }
        setError(null);
        try {
            await onSubmit({ freeform_text: text });
            setFreeformDraft("");
            setFreeformMode(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit");
        }
    };

    const disabled = !isActive || submitting;

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3.5 py-2.5">
                <IconHelpCircle className="size-4 text-primary" />
                <span className="text-[13px] font-medium text-foreground">
                    The agent is asking for input
                </span>
            </div>
            <div className="flex flex-col gap-5 px-3.5 py-3.5">
                {content.context ? (
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {content.context}
                    </p>
                ) : null}

                {freeformMode ? (
                    <div className="flex flex-col gap-1.5">
                        <FieldLabel>Reply in your own words</FieldLabel>
                        <textarea
                            className="min-h-[100px] w-full rounded-lg border border-border bg-background p-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary disabled:opacity-60"
                            placeholder="Type whatever you want the agent to know — it'll skip the form."
                            maxLength={4000}
                            value={freeformDraft}
                            disabled={disabled}
                            onChange={(e) => setFreeformDraft(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {content.questions.map((q) => (
                            <div key={q.id} className="flex flex-col gap-2">
                                <FieldLabel>{q.text}</FieldLabel>
                                <QuestionAnswerInput
                                    kind={q.answer_kind}
                                    value={draft[q.id]}
                                    disabled={disabled}
                                    onChange={(v) => setAnswer(q.id, v)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {error ? (
                    <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-[12px] text-error">
                        {error}
                    </div>
                ) : null}

                {isActive ? (
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                                setError(null);
                                setFreeformMode((v) => !v);
                            }}
                            className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        >
                            {freeformMode
                                ? "← Back to the form"
                                : "Reply freely instead"}
                        </button>
                        <Button
                            onClick={
                                freeformMode
                                    ? handleFreeformSubmit
                                    : handleSubmit
                            }
                            disabled={submitting}
                        >
                            {submitting ? "Submitting…" : "Submit answer"}
                        </Button>
                    </div>
                ) : (
                    <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                        A newer message has been sent; this question is no longer
                        active.
                    </div>
                )}
            </div>
        </div>
    );
}
