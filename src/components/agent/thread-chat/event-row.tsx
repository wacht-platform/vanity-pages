import * as React from "react";
import {
  IconAlertTriangle,
  IconFileText,
  IconRobot,
  IconSearch,
  IconShieldExclamation,
  IconSlash,
  IconSparkles,
  IconWriting,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

function formatDecisionStep(step: string) {
  return step
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getDecisionStepMeta(step: string) {
  switch (step) {
    case "steer":
      return {
        icon: <IconSparkles className="h-3.5 w-3.5" />,
        label: "Steer",
      };
    case "startaction":
      return {
        icon: <IconWriting className="h-3.5 w-3.5" />,
        label: "Start action",
      };
    case "continueaction":
      return {
        icon: <IconWriting className="h-3.5 w-3.5" />,
        label: "Continue action",
      };
    case "searchtools":
      return {
        icon: <IconSearch className="h-3.5 w-3.5" />,
        label: "Search tools",
      };
    case "loadtools":
      return {
        icon: <IconFileText className="h-3.5 w-3.5" />,
        label: "Load tools",
      };
    case "enablelongthink":
      return {
        icon: <IconRobot className="h-3.5 w-3.5" />,
        label: "Enable long think",
      };
    case "abort":
      return {
        icon: <IconSlash className="h-3.5 w-3.5" />,
        label: "Abort",
      };
    case "loop_detection":
      return {
        icon: <IconAlertTriangle className="h-3.5 w-3.5" />,
        label: "Loop detection",
      };
    case "long_think_mode_enabled":
      return {
        icon: <IconRobot className="h-3.5 w-3.5" />,
        label: "Long think enabled",
      };
    case "complete_blocked_by_task_graph":
    case "complete_blocked_by_incomplete_child_tasks":
    case "complete_blocked_by_task_ownership":
    case "terminal_stop_blocked_by_missing_task_brief":
      return {
        icon: <IconShieldExclamation className="h-3.5 w-3.5" />,
        label: formatDecisionStep(step),
      };
    default:
      return {
        icon: <IconRobot className="h-3.5 w-3.5" />,
        label: formatDecisionStep(step),
      };
  }
}

export function getStatusIndicator(status?: string) {
  const colors: Record<string, string> = {
    completed: "bg-success",
    failed: "bg-error",
    blocked: "bg-error",
    rejected: "bg-error",
    running: "bg-info animate-pulse",
    in_progress: "bg-info",
    available: "bg-warning",
  };

  return (
    <div
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        colors[status || ""] || "bg-muted-foreground/40",
      )}
    />
  );
}

export type TraceNodeStatus = "ok" | "err" | "run" | "idle";

function traceNodeClass(node: TraceNodeStatus) {
  switch (node) {
    case "ok":
      return "border-success";
    case "err":
      return "border-error";
    case "run":
      return "border-primary";
    default:
      return "border-faint";
  }
}

// Design `tr-step` + `tr-card`: timeline node, card head (icon/name/kind/meta/chevron),
// and an expandable `tr-body`.
export function InlineEventRow({
  icon,
  title,
  meta,
  defaultOpen,
  kind,
  node = "idle",
  primaryIcon,
  duration,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  kind?: string;
  node?: TraceNodeStatus;
  primaryIcon?: boolean;
  duration?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasBody =
    React.Children.toArray(children).filter(Boolean).length > 0;
  return (
    <div className="relative pb-3 pl-7 before:absolute before:bottom-[-2px] before:left-2 before:top-2 before:border-l before:border-border before:content-[''] last:pb-0 last:before:hidden">
      <span
        className={cn(
          "absolute left-0.5 top-3.5 z-[1] size-[13px] rounded-full border-2 bg-background",
          traceNodeClass(node),
        )}
      />
      <details
        open={defaultOpen}
        className="group/event overflow-hidden rounded-[10px] border border-border bg-card"
      >
        <summary className="flex cursor-pointer list-none select-none items-center gap-2.5 px-3.5 py-[11px]">
          <span
            className={cn(
              "grid size-6 flex-none place-items-center rounded-[6px]",
              primaryIcon
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-foreground-secondary",
              "[&_svg]:size-3.5",
            )}
          >
            {icon}
          </span>
          <span className="text-[13px] font-medium text-foreground">
            {title}
          </span>
          {kind ? (
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-faint">
              {kind}
            </span>
          ) : null}
          <span className="flex-1" />
          {meta}
          {duration ? (
            <span className="font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
              {duration}
            </span>
          ) : null}
          <span
            className={cn(
              "flex size-3.5 items-center justify-center text-faint transition-transform duration-150 group-open/event:rotate-90",
              !hasBody && "opacity-40 group-open/event:rotate-0",
            )}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M3 2l4 3-4 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </summary>
        {hasBody ? (
          <div className="flex max-h-[400px] flex-col gap-2.5 overflow-auto border-t border-border px-3.5 pb-3.5 pt-3">
            {children}
          </div>
        ) : null}
      </details>
    </div>
  );
}

export function InlineStatusBadge({
  status,
  label,
}: {
  status: "pending" | "completed" | "failed" | "success" | "error";
  label?: string;
}) {
  const isOk = status === "completed" || status === "success";
  const isErr = status === "failed" || status === "error";
  return (
    <span
      className={cn(
        "inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
        isOk
          ? "border-success/30 bg-success-soft text-success"
          : isErr
            ? "border-border bg-secondary text-foreground-secondary"
            : "border-warning/30 bg-warning-soft text-warning",
      )}
    >
      <span
        className={cn(
          "size-[6px] rounded-full",
          isOk ? "bg-success" : isErr ? "bg-error" : "bg-warning",
        )}
      />
      {label ?? status}
    </span>
  );
}
