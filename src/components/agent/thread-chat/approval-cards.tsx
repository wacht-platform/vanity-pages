import {
  IconCircleCheck,
  IconShieldExclamation,
} from "@tabler/icons-react";

import type {
  ApprovalRequestContent,
  ApprovalResponseContent,
} from "@wacht/types";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { InlineEventRow, InlineStatusBadge } from "./event-row";
import type { ApprovalChoice } from "./shared";

export function ApprovalRequestCard({
  content,
  requestId,
  isActive,
  selections,
  submitting,
  onSetToolChoice,
  onSubmit,
}: {
  content: ApprovalRequestContent;
  requestId: string;
  isActive: boolean;
  selections: Record<string, ApprovalChoice>;
  submitting: boolean;
  onSetToolChoice: (
    requestId: string,
    toolName: string,
    choice: ApprovalChoice,
    submitImmediately?: boolean,
  ) => void;
  onSubmit: (requestId: string) => void;
}) {
  const selectedCount = content.tools.filter(
    (tool) => (selections[tool.tool_name] ?? "deny") !== "deny",
  ).length;
  const requiresExplicitSubmit = content.tools.length > 1;
  const singleTool = !requiresExplicitSubmit ? content.tools[0] : null;

  return (
    <InlineEventRow
      icon={<IconShieldExclamation className="h-3.5 w-3.5" />}
      title="Approval required"
      defaultOpen={isActive}
    >
      <div className="space-y-2">
        {requiresExplicitSubmit ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {content.description}
          </p>
        ) : content.description &&
          singleTool &&
          content.description.trim() !== singleTool.tool_name ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {content.description}
          </p>
        ) : null}
        {!isActive ? (
          <p className="text-sm leading-6 text-muted-foreground/70">
            This approval request is no longer active.
          </p>
        ) : null}
        {content.tools.map((tool) => {
          const selection = selections[tool.tool_name] ?? "deny";

          return (
            <div
              key={tool.tool_name}
              className={cn(
                "flex items-start justify-between gap-4 text-sm",
                requiresExplicitSubmit ? "" : "pt-0.5",
              )}
            >
              {requiresExplicitSubmit ? (
                <div className="min-w-0 max-w-100 pt-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {tool.tool_name}
                  </span>
                </div>
              ) : null}
              <div className="inline-flex shrink-0 items-center rounded-lg bg-accent/30 p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={selection === "allow_once" ? "default" : "ghost"}
                  className="h-6 rounded-md px-2.5 text-xs font-medium"
                  disabled={!isActive || submitting}
                  onClick={() =>
                    onSetToolChoice(
                      requestId,
                      tool.tool_name,
                      "allow_once",
                      !requiresExplicitSubmit,
                    )
                  }
                >
                  Allow once
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selection === "allow_always" ? "default" : "ghost"}
                  className="h-6 rounded-md px-2.5 text-xs font-medium"
                  disabled={!isActive || submitting}
                  onClick={() =>
                    onSetToolChoice(
                      requestId,
                      tool.tool_name,
                      "allow_always",
                      !requiresExplicitSubmit,
                    )
                  }
                >
                  Always
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selection === "deny" ? "secondary" : "ghost"}
                  className="h-6 rounded-md px-2.5 text-xs font-medium"
                  disabled={!isActive || submitting}
                  onClick={() =>
                    onSetToolChoice(
                      requestId,
                      tool.tool_name,
                      "deny",
                      !requiresExplicitSubmit,
                    )
                  }
                >
                  Deny
                </Button>
              </div>
            </div>
          );
        })}
        {requiresExplicitSubmit ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {selectedCount} of {content.tools.length} approved
            </span>
            <Button
              type="button"
              size="sm"
              className="h-6 px-3 text-xs"
              disabled={!isActive || submitting}
              onClick={() => onSubmit(requestId)}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </div>
    </InlineEventRow>
  );
}

export function ApprovalResponseCard({
  content,
}: {
  content: ApprovalResponseContent;
}) {
  return (
    <InlineEventRow
      icon={<IconCircleCheck className="h-3.5 w-3.5" />}
      title="Approval response"
    >
      {content.approvals.length > 0 ? (
        <div className="space-y-1">
          {content.approvals.map((approval) => (
            <div
              key={`${approval.tool_name}-${approval.mode}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate text-foreground/80">{approval.tool_name}</span>
              <InlineStatusBadge
                status="completed"
                label={approval.mode.replace(/_/g, " ")}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          All requested tools were denied.
        </p>
      )}
      {content.request_message_id ? (
        <p className="text-xs text-muted-foreground/60">
          Request {content.request_message_id}
        </p>
      ) : null}
    </InlineEventRow>
  );
}
