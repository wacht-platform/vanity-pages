import * as React from "react";

import { cn } from "@/lib/utils";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatStructuredLabel(value: string) {
  const normalized = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return value;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function coerceStructuredValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  const looksLikeJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (!looksLikeJson) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function isPrimitiveValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export function hasStructuredContent(value: unknown): boolean {
  const normalized = coerceStructuredValue(value);
  if (normalized === undefined || normalized === null) return false;
  if (typeof normalized === "string") return normalized.trim().length > 0;
  if (Array.isArray(normalized)) return normalized.length > 0;
  if (isObjectRecord(normalized)) return Object.keys(normalized).length > 0;
  return true;
}

function StructuredPrimitiveValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-sm text-muted-foreground/70">None</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-sm text-foreground/80">{value ? "Yes" : "No"}</span>;
  }

  if (typeof value === "number") {
    return <span className="text-sm text-foreground/80">{value}</span>;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return <span className="text-sm text-muted-foreground/70">Empty</span>;
    }

    const isBlock = value.includes("\n") || value.length > 120;
    if (isBlock) {
      return (
        <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word px-0 py-0 text-sm leading-6 text-foreground/78">
          {value}
        </pre>
      );
    }

    return <p className="wrap-break-word text-sm leading-6 text-foreground/80">{value}</p>;
  }

  return <p className="wrap-break-word text-sm leading-6 text-foreground/80">{String(value)}</p>;
}

function StructuredArrayValue({
  value,
  depth = 0,
}: {
  value: unknown[];
  depth?: number;
}) {
  const normalizedItems = value.map((item) => coerceStructuredValue(item));
  const primitiveItems = normalizedItems.every((item) => isPrimitiveValue(item));

  if (normalizedItems.length === 0) {
    return <span className="text-sm text-muted-foreground/70">None</span>;
  }

  if (
    primitiveItems &&
    normalizedItems.every((item) => typeof item !== "string" || !item.includes("\n"))
  ) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {normalizedItems.map((item, index) => (
          <span
            key={`${String(item)}-${index}`}
            className="inline-flex items-center rounded-full bg-accent/25 px-2 py-0.5 text-xs text-foreground/75"
          >
            {item === null ? "None" : typeof item === "boolean" ? (item ? "Yes" : "No") : String(item)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {normalizedItems.map((item, index) => (
        <div key={index} className="pl-3">
          {isObjectRecord(item) || Array.isArray(item) ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground/70">Item {index + 1}</p>
              <StructuredValue value={item} depth={depth + 1} />
            </div>
          ) : (
            <StructuredPrimitiveValue value={item} />
          )}
        </div>
      ))}
    </div>
  );
}

function StructuredObjectValue({
  value,
  depth = 0,
}: {
  value: Record<string, unknown>;
  depth?: number;
}) {
  const entries = Object.entries(value).filter(([, item]) => hasStructuredContent(item));

  if (entries.length === 0) {
    return <span className="text-sm text-muted-foreground/70">None</span>;
  }

  return (
    <div className={cn("space-y-2", depth > 0 && "border-l border-border/20 pl-3")}>
      {entries.map(([key, item]) => {
        const normalized = coerceStructuredValue(item);
        const isInline =
          isPrimitiveValue(normalized) ||
          (Array.isArray(normalized) &&
            normalized.every((entry) => isPrimitiveValue(coerceStructuredValue(entry))) &&
            normalized.length <= 6);

        return (
          <div key={key} className="space-y-1.5">
            <p className="text-xs text-muted-foreground/70">{formatStructuredLabel(key)}</p>
            {isInline ? (
              Array.isArray(normalized) ? (
                <StructuredArrayValue value={normalized} depth={depth + 1} />
              ) : (
                <StructuredPrimitiveValue value={normalized} />
              )
            ) : (
              <div className="pl-3">
                <StructuredValue value={normalized} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StructuredValue({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  const normalized = coerceStructuredValue(value);

  if (isPrimitiveValue(normalized)) {
    return <StructuredPrimitiveValue value={normalized} />;
  }

  if (Array.isArray(normalized)) {
    return <StructuredArrayValue value={normalized} depth={depth} />;
  }

  if (isObjectRecord(normalized)) {
    return <StructuredObjectValue value={normalized} depth={depth} />;
  }

  return <StructuredPrimitiveValue value={normalized} />;
}

export function ToolDetailSection({ label, data }: { label: string; data: unknown }) {
  if (!hasStructuredContent(data)) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground/70">{label}</p>
      <div className="px-0 py-0">
        <StructuredValue value={data} />
      </div>
    </div>
  );
}
