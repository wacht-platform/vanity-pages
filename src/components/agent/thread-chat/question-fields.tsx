"use client";

import * as React from "react";
import { IconCheck } from "@tabler/icons-react";
import type { AnswerKind, AnswerValue } from "@wacht/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[13px] font-medium text-foreground">
            {children}
        </span>
    );
}

function ChoiceRow({
    selected,
    multi,
    disabled,
    label,
    description,
    onSelect,
}: {
    selected: boolean;
    multi?: boolean;
    disabled?: boolean;
    label: string;
    description?: string;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                selected
                    ? "border-primary bg-primary/5"
                    : "border-border enabled:hover:border-input enabled:hover:bg-accent/40",
            )}
        >
            <span
                className={cn(
                    "mt-0.5 flex size-[16px] shrink-0 items-center justify-center border transition-colors",
                    multi ? "rounded-[5px]" : "rounded-full",
                    selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                )}
            >
                {selected ? <IconCheck className="size-3" stroke={3} /> : null}
            </span>
            <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">
                    {label}
                </span>
                {description ? (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {description}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

function SegmentedChoice({
    disabled,
    options,
}: {
    disabled?: boolean;
    options: {
        label: string;
        selected: boolean;
        tone?: "default" | "danger";
        onSelect: () => void;
    }[];
}) {
    return (
        <div className="flex gap-2">
            {options.map((opt) => (
                <button
                    key={opt.label}
                    type="button"
                    disabled={disabled}
                    onClick={opt.onSelect}
                    className={cn(
                        "h-9 flex-1 rounded-lg border px-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        opt.selected
                            ? opt.tone === "danger"
                                ? "border-error bg-error/10 text-error"
                                : "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground enabled:hover:border-input enabled:hover:bg-accent/40",
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export function QuestionAnswerInput({
    kind,
    value,
    disabled,
    onChange,
}: {
    kind: AnswerKind;
    value: AnswerValue | undefined;
    disabled?: boolean;
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
                    onChange={(e) =>
                        onChange({ kind: "free_text", value: e.target.value })
                    }
                />
            );
        }
        case "single_choice": {
            const current =
                value?.kind === "single_choice" ? value.value : "";
            return (
                <div className="flex flex-col gap-1.5">
                    {kind.choices.map((c) => (
                        <ChoiceRow
                            key={c.value}
                            disabled={disabled}
                            selected={current === c.value}
                            label={c.label}
                            description={c.description}
                            onSelect={() =>
                                onChange({
                                    kind: "single_choice",
                                    value: c.value,
                                })
                            }
                        />
                    ))}
                </div>
            );
        }
        case "multi_choice": {
            const current =
                value?.kind === "multi_choice" ? value.values : [];
            const toggle = (v: string) => {
                const next = current.includes(v)
                    ? current.filter((x) => x !== v)
                    : [...current, v];
                onChange({ kind: "multi_choice", values: next });
            };
            return (
                <div className="flex flex-col gap-1.5">
                    {kind.choices.map((c) => (
                        <ChoiceRow
                            key={c.value}
                            multi
                            disabled={disabled}
                            selected={current.includes(c.value)}
                            label={c.label}
                            description={c.description}
                            onSelect={() => toggle(c.value)}
                        />
                    ))}
                </div>
            );
        }
        case "yes_no": {
            const current = value?.kind === "yes_no" ? value.value : undefined;
            return (
                <SegmentedChoice
                    disabled={disabled}
                    options={[
                        {
                            label: "Yes",
                            selected: current === true,
                            onSelect: () =>
                                onChange({ kind: "yes_no", value: true }),
                        },
                        {
                            label: "No",
                            selected: current === false,
                            onSelect: () =>
                                onChange({ kind: "yes_no", value: false }),
                        },
                    ]}
                />
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
                        <span className="text-sm text-muted-foreground">
                            {kind.unit}
                        </span>
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
                    onChange={(e) =>
                        onChange({ kind: "date", value: e.target.value })
                    }
                />
            );
        }
        case "confirm": {
            const current =
                value?.kind === "confirm" ? value.accepted : undefined;
            return (
                <SegmentedChoice
                    disabled={disabled}
                    options={[
                        {
                            label: kind.confirm_label,
                            selected: current === true,
                            onSelect: () =>
                                onChange({ kind: "confirm", accepted: true }),
                        },
                        {
                            label: kind.cancel_label,
                            selected: current === false,
                            tone: "danger",
                            onSelect: () =>
                                onChange({ kind: "confirm", accepted: false }),
                        },
                    ]}
                />
            );
        }
    }
}

export function formatAnswerValue(value: AnswerValue): string {
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
