"use client";

import * as React from "react";
import { useAgentThreadConversation } from "@wacht/nextjs";
import type {
    ApprovalRequestContent,
    ConversationMessage,
    ToolApprovalDecision,
} from "@wacht/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IconAlertCircle, IconCircleCheck, IconClock, IconShieldCode } from "@tabler/icons-react";

type ApprovalChoice = "deny" | ToolApprovalDecision["mode"];

type PendingThreadAction =
    | {
          kind: "approval";
          message: ConversationMessage;
          content: ApprovalRequestContent;
      }
    | null;

function findPendingThreadAction(messages: ConversationMessage[]): PendingThreadAction {
    const sorted = [...messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const resolvedApprovalRequestIds = new Set<string>();
    for (const message of sorted) {
        if (message.content.type === "approval_response") {
            const requestId = (message.content as { request_message_id?: string }).request_message_id;
            if (requestId) {
                resolvedApprovalRequestIds.add(requestId);
            }
        }
    }

    for (let index = sorted.length - 1; index >= 0; index -= 1) {
        const message = sorted[index];
        if (
            message.content.type === "approval_request" &&
            !resolvedApprovalRequestIds.has(String(message.id))
        ) {
            return {
                kind: "approval",
                message,
                content: message.content,
            };
        }
    }

    return null;
}

export function ThreadPendingActionPanel({
    threadId,
    compact = false,
}: {
    threadId: string;
    compact?: boolean;
}) {
    const {
        messages,
        messagesLoading,
        messagesError,
        submitApprovalResponse,
        refreshMessages,
    } = useAgentThreadConversation({
        threadId,
    });
    const [submissionError, setSubmissionError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [approvalSelections, setApprovalSelections] = React.useState<Record<string, ApprovalChoice>>({});

    const pendingAction = React.useMemo(
        () => findPendingThreadAction(messages),
        [messages],
    );

    React.useEffect(() => {
        if (pendingAction?.kind === "approval") {
            setApprovalSelections(
                Object.fromEntries(
                    pendingAction.content.tools.map((tool) => [tool.tool_name, "deny" as ApprovalChoice]),
                ),
            );
        } else {
            setApprovalSelections({});
        }
    }, [pendingAction]);

    const error = submissionError || messagesError?.message || null;

    const handleSubmitApproval = async () => {
        if (!pendingAction || pendingAction.kind !== "approval") return;
        setSubmitting(true);
        setSubmissionError(null);
        try {
            const approvals = Object.entries(approvalSelections)
                .filter(([, choice]) => choice !== "deny")
                .map(([tool_name, mode]) => ({
                    tool_name,
                    mode: mode as ToolApprovalDecision["mode"],
                }));

            const ok = await submitApprovalResponse(
                String(pendingAction.message.id),
                approvals,
            );
            if (!ok) {
                throw new Error("Failed to submit approval response");
            }
            await refreshMessages();
        } catch (err) {
            setSubmissionError(
                err instanceof Error
                    ? err.message
                    : "Failed to submit approval response",
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (messagesLoading) {
        return (
            <div className="flex items-center gap-1.5 py-1 px-2 mb-2 bg-secondary/30 rounded w-fit">
                <IconClock size={12} stroke={1.5} className="text-muted-foreground animate-pulse" />
                <span className="text-xs text-muted-foreground font-normal tracking-tight">Syncing…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-1.5 py-1 px-2 mb-2 bg-destructive/5 text-destructive/60 rounded border border-destructive/10 w-fit">
                <IconAlertCircle size={12} stroke={1.5} />
                <span className="text-xs font-normal tracking-tight">{error}</span>
            </div>
        );
    }

    if (!pendingAction) {
        if (compact) return null;
        return (
            <div className="flex flex-col items-center justify-center py-6 opacity-10">
                <IconCircleCheck size={16} stroke={1} />
                <p className="mt-1.5 text-xs font-normal tracking-tight">Autonomous</p>
            </div>
        );
    }

    const content = (
        <ApprovalActionContent
            compact={compact}
            pendingAction={pendingAction}
            selections={approvalSelections}
            setSelections={setApprovalSelections}
            submitting={submitting}
            onSubmit={handleSubmitApproval}
        />
    );

    if (compact) {
        return (
            <div className="animate-in fade-in duration-200">
                <div className="rounded border border-border/50 bg-secondary/10 p-3">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <section className="animate-in fade-in duration-200">
             <div className="flex items-center gap-1.5 mb-2.5 opacity-60">
                <IconAlertCircle size={12} stroke={1.5} className="text-primary" />
                <h2 className="text-xs font-normal tracking-tight">Action required</h2>
            </div>
            {content}
        </section>
    );
}

function ApprovalActionContent({
    pendingAction,
    selections,
    setSelections,
    submitting,
    onSubmit,
}: {
    compact: boolean;
    pendingAction: Extract<PendingThreadAction, { kind: "approval" }>;
    selections: Record<string, ApprovalChoice>;
    setSelections: React.Dispatch<React.SetStateAction<Record<string, ApprovalChoice>>>;
    submitting: boolean;
    onSubmit: () => Promise<void>;
}) {
    return (
        <div className="space-y-2.5">
            <div className="space-y-0.5 px-0.5">
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                    <IconShieldCode size={12} stroke={1.5} className="text-primary" />
                    <span className="text-xs font-normal tracking-tight">Policy approval</span>
                </div>
                <p className={cn("text-xs font-normal leading-relaxed text-muted-foreground/60")}>
                    {pendingAction.content.description}
                </p>
            </div>

            <div className="space-y-1">
                {pendingAction.content.tools.map((tool) => (
                    <div key={tool.tool_name} className={cn("flex items-center justify-between gap-3 rounded bg-secondary/30 px-2.5 py-1.5")}>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-normal text-foreground/80 tracking-tight truncate">{tool.tool_name}</div>
                        </div>
                        <Select
                            value={selections[tool.tool_name] || "deny"}
                            onValueChange={(value) =>
                                setSelections((current) => ({
                                    ...current,
                                    [tool.tool_name]: value as ApprovalChoice,
                                }))
                            }
                        >
                            <SelectTrigger className="h-7 w-[100px] bg-background/50 border-border/60 text-xs font-normal shadow-none hover:bg-background focus:ring-0 px-2 rounded-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-sm shadow-xl border-border">
                                <SelectItem value="deny" className="text-xs font-normal text-destructive/80">Deny</SelectItem>
                                <SelectItem value="allow_once" className="text-xs font-normal">Once</SelectItem>
                                <SelectItem value="allow_always" className="text-xs font-normal">Always</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-2">
                <Button 
                    variant="default"
                    disabled={submitting} 
                    onClick={() => void onSubmit()}
                    className="h-7 px-4 rounded-full font-normal text-xs transition-all bg-primary/90 text-primary-foreground hover:bg-primary"
                >
                    {submitting ? "Processing…" : "Confirm Approval"}
                </Button>
            </div>
        </div>
    );
}
