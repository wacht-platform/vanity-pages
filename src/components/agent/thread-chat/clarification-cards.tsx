"use client";

import * as React from "react";
import {
    IconChevronDown,
    IconChevronRight,
    IconCircleCheck,
    IconClockX,
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

    const questionCountLabel = `${content.questions.length} ${
        content.questions.length === 1 ? "question" : "questions"
    }`;

    if (!response && expired) {
        return (
            <div className="my-3 overflow-hidden rounded-xl border border-border bg-muted/15">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
                >
                    <IconClockX className="size-4 text-muted-foreground" />
                    <span className="text-[13px] font-medium text-muted-foreground">
                        Question expired
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground/70">
                        superseded
                        {expanded ? (
                            <IconChevronDown size={13} />
                        ) : (
                            <IconChevronRight size={13} />
                        )}
                    </span>
                </button>
                {expanded ? (
                    <ul className="divide-y divide-border border-t border-border">
                        {content.questions.map((q) => (
                            <li
                                key={q.id}
                                className="px-3.5 py-2 text-[13px] text-muted-foreground"
                            >
                                {q.text}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    if (response) {
        if (response.freeform_text) {
            return (
                <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3.5 py-2.5">
                        <IconCircleCheck className="size-4 text-success" />
                        <span className="text-[13px] font-medium text-foreground">
                            Replied
                        </span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                            free-form
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap px-3.5 py-3 text-[13px] leading-relaxed text-foreground/90">
                        {response.freeform_text}
                    </p>
                </div>
            );
        }
        const answersById = new Map(
            (response.answers ?? []).map((a) => [a.question_id, a.value]),
        );
        return (
            <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3.5 py-2.5">
                    <IconCircleCheck className="size-4 text-success" />
                    <span className="text-[13px] font-medium text-foreground">
                        Answered
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                        {questionCountLabel}
                    </span>
                </div>
                <ul className="divide-y divide-border">
                    {content.questions.map((q) => {
                        const a = answersById.get(q.id);
                        return (
                            <li key={q.id} className="px-3.5 py-2.5">
                                <div className="text-xs text-muted-foreground">
                                    {q.text}
                                </div>
                                <div className="mt-0.5 text-[13px] font-medium text-foreground">
                                    {a ? formatAnswerValue(a) : "—"}
                                </div>
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
