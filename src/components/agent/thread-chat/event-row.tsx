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
    completed: "bg-emerald-500",
    failed: "bg-rose-500",
    blocked: "bg-rose-500",
    rejected: "bg-rose-500",
    running: "bg-blue-500 animate-pulse",
    in_progress: "bg-blue-500",
    available: "bg-amber-500",
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

function statusTone(
  status: "pending" | "completed" | "failed" | "success" | "error",
) {
  switch (status) {
    case "completed":
    case "success":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "failed":
    case "error":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
}

export function InlineEventRow({
  icon,
  title,
  meta,
  defaultOpen,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group/event w-full">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1 select-none">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary/70">
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground/80">{title}</span>
        {meta}
        <div className="ml-auto flex h-4 w-4 items-center justify-center rounded text-muted-foreground/40 transition-transform duration-150 group-open/event:rotate-90">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 2l4 3-4 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </summary>
      <div className="ml-7 mt-1 space-y-2 pb-1">{children}</div>
    </details>
  );
}

export function InlineStatusBadge({
  status,
  label,
}: {
  status: "pending" | "completed" | "failed" | "success" | "error";
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusTone(status),
      )}
    >
      {label ?? status}
    </span>
  );
}
