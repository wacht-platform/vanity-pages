"use client";

import * as React from "react";
import type {
    AnswerSubmission,
    AnswerValue,
    PendingQuestion,
    Question,
    QuestionAnswer,
} from "@wacht/types";
import { Button } from "@/components/ui/button";
import {
    FieldLabel,
    QuestionAnswerInput,
} from "@/components/agent/thread-chat/question-fields";

type Props = {
    pending: PendingQuestion;
    onSubmit: (submission: AnswerSubmission) => Promise<unknown>;
    busy?: boolean;
};

export function PendingQuestionCard({ pending, onSubmit, busy }: Props) {
    const [draft, setDraft] = React.useState<
        Record<string, AnswerValue | undefined>
    >({});
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [freeformDraft, setFreeformDraft] = React.useState("");
    const [freeformMode, setFreeformMode] = React.useState(false);

    const setAnswer = (id: string, value: AnswerValue) => {
        setDraft((prev) => ({ ...prev, [id]: value }));
    };

    const submitWith = async (submission: AnswerSubmission) => {
        setError(null);
        setSubmitting(true);
        try {
            await onSubmit(submission);
            setDraft({});
            setFreeformDraft("");
            setFreeformMode(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit");
        } finally {
            setSubmitting(false);
        }
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
        await submitWith({ answers });
    };

    const handleFreeformSubmit = async () => {
        const text = freeformDraft.trim();
        if (text === "") {
            setError("Type a message before sending.");
            return;
        }
        await submitWith({ freeform_text: text });
    };

    const busyState = busy || submitting;

    return (
        <div className="flex flex-col gap-5">
            {pending.context ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {pending.context}
                </p>
            ) : null}

            {freeformMode ? (
                <div className="flex flex-col gap-1.5">
                    <FieldLabel>Reply in your own words</FieldLabel>
                    <textarea
                        className="min-h-[120px] w-full rounded-lg border border-border bg-background p-3 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
                        placeholder="Type whatever you want the agent to know — it'll skip the form."
                        maxLength={4000}
                        value={freeformDraft}
                        onChange={(e) => setFreeformDraft(e.target.value)}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {pending.questions.map((q: Question) => (
                        <div key={q.id} className="flex flex-col gap-2">
                            <FieldLabel>{q.text}</FieldLabel>
                            <QuestionAnswerInput
                                kind={q.answer_kind}
                                value={draft[q.id]}
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

            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <button
                    type="button"
                    disabled={busyState}
                    onClick={() => {
                        setError(null);
                        setFreeformMode((v) => !v);
                    }}
                    className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                    {freeformMode ? "← Back to the form" : "Reply freely instead"}
                </button>
                <Button
                    onClick={freeformMode ? handleFreeformSubmit : handleSubmit}
                    disabled={busyState}
                >
                    {submitting ? "Submitting…" : "Submit answer"}
                </Button>
            </div>
        </div>
    );
}
