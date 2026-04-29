"use client";

import * as React from "react";
import type {
    CreateProjectTaskBoardItemRequest,
    ProjectTaskBoardItem,
    UpdateProjectTaskBoardItemRequest,
} from "@wacht/types";
import { IconPaperclip, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextMarkdownInput } from "@/components/agent/rich-text-markdown-input";

type TaskFormValues = {
    title: string;
    description: string;
    priority: "urgent" | "high" | "neutral" | "low";
    scheduleKind: "none" | "once" | "interval";
    nextRunAt: string;
    intervalSeconds: string;
};

function defaultTaskValues(): TaskFormValues {
    return {
        title: "",
        description: "",
        priority: "neutral",
        scheduleKind: "none",
        nextRunAt: "",
        intervalSeconds: "",
    };
}

function valuesFromTask(task: ProjectTaskBoardItem): TaskFormValues {
    const schedule = task.schedule;
    return {
        title: task.title || "",
        description: task.description || "",
        priority: normalizePriority(task.priority),
        scheduleKind:
            schedule?.schedule_kind === "once" || schedule?.schedule_kind === "interval"
                ? schedule.schedule_kind
                : "none",
        nextRunAt: formatDateTimeLocal(schedule?.next_run_at),
        intervalSeconds: schedule?.interval_seconds ? String(schedule.interval_seconds) : "",
    };
}

function normalizePriority(value?: string): TaskFormValues["priority"] {
    switch (value) {
        case "urgent":
        case "high":
        case "low":
            return value;
        default:
            return "neutral";
    }
}

function normalizeNextRunAt(value: string, scheduleKind: TaskFormValues["scheduleKind"]) {
    if (scheduleKind === "none" || !value) return undefined;
    const iso = new Date(value).toISOString();
    return Number.isNaN(Date.parse(iso)) ? undefined : iso;
}

function formatDateTimeLocal(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

type CreateTaskDialogProps = {
    onCreate: (request: CreateProjectTaskBoardItemRequest, files?: File[]) => Promise<void>;
    trigger?: React.ReactNode;
};

export function CreateTaskDialog({ onCreate, trigger }: CreateTaskDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [values, setValues] = React.useState<TaskFormValues>(defaultTaskValues);
    const [files, setFiles] = React.useState<File[]>([]);

    React.useEffect(() => {
        if (!open) {
            setValues(defaultTaskValues());
            setFiles([]);
        }
    }, [open]);

    const submit = async () => {
        if (!values.title.trim()) return;
        setSubmitting(true);
        try {
            await onCreate({
                title: values.title.trim(),
                description: values.description.trim() || undefined,
                priority: values.priority,
                schedule_kind: values.scheduleKind === "none" ? undefined : values.scheduleKind,
                next_run_at: normalizeNextRunAt(values.nextRunAt, values.scheduleKind),
                interval_seconds:
                    values.scheduleKind === "interval" && values.intervalSeconds.trim()
                        ? Number(values.intervalSeconds)
                        : undefined,
            }, files);
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md border-border/60 px-2.5 text-sm font-normal shadow-none"
                    >
                        New task
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-normal">Create Task</DialogTitle>
                    <DialogDescription className="text-sm">
                        Keep this simple. Add the task title and a short brief.
                    </DialogDescription>
                </DialogHeader>
                <TaskForm values={values} onChange={setValues} files={files} onFilesChange={setFiles} />
                <DialogFooter>
                    <Button variant="outline" className="font-normal" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button className="font-normal" disabled={submitting || !values.title.trim()} onClick={submit}>
                        {submitting ? "Creating..." : "Create task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type EditTaskDialogProps = {
    task: ProjectTaskBoardItem;
    onUpdate: (request: UpdateProjectTaskBoardItemRequest, files?: File[]) => Promise<void>;
};

export function EditTaskDialog({ task, onUpdate }: EditTaskDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [values, setValues] = React.useState<TaskFormValues>(() => valuesFromTask(task));
    const [files, setFiles] = React.useState<File[]>([]);

    React.useEffect(() => {
        setValues(valuesFromTask(task));
    }, [task]);

    React.useEffect(() => {
        if (!open) {
            setFiles([]);
        }
    }, [open]);

    const submit = async () => {
        if (!values.title.trim()) return;
        setSubmitting(true);
        try {
            await onUpdate({
                title: values.title.trim(),
                description: values.description.trim() || undefined,
                priority: values.priority,
                schedule_kind: values.scheduleKind === "none" ? undefined : values.scheduleKind,
                next_run_at: normalizeNextRunAt(values.nextRunAt, values.scheduleKind),
                interval_seconds:
                    values.scheduleKind === "interval" && values.intervalSeconds.trim()
                        ? Number(values.intervalSeconds)
                        : undefined,
                clear_schedule: values.scheduleKind === "none" && !!task.schedule,
            }, files);
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="font-normal">Edit task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-normal">Edit Task</DialogTitle>
                    <DialogDescription className="text-sm">
                        Update the core task details without changing its assignment history.
                    </DialogDescription>
                </DialogHeader>
                <TaskForm values={values} onChange={setValues} files={files} onFilesChange={setFiles} />
                <DialogFooter>
                    <Button variant="outline" className="font-normal" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button className="font-normal" disabled={submitting || !values.title.trim()} onClick={submit}>
                        {submitting ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TaskForm({
    values,
    onChange,
    files,
    onFilesChange,
}: {
    values: TaskFormValues;
    onChange: React.Dispatch<React.SetStateAction<TaskFormValues>>;
    files: File[];
    onFilesChange: React.Dispatch<React.SetStateAction<File[]>>;
}) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const setField = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
        onChange((current) => ({ ...current, [key]: value }));
    };

    return (
        <div className="grid gap-5 py-2">
            <div className="grid gap-2">
                <Label className="font-normal" htmlFor="task-title">Title</Label>
                <Input
                    id="task-title"
                    value={values.title}
                    onChange={(event) => setField("title", event.target.value)}
                    placeholder="Investigate error path, Review launch copy, Prepare handoff"
                />
            </div>

            <div className="grid gap-2">
                <Label className="font-normal" htmlFor="task-description">Description</Label>
                <RichTextMarkdownInput
                    value={values.description}
                    onChange={(value) => setField("description", value)}
                    placeholder="Describe the task and the expected outcome."
                    className="rounded-md border border-input bg-transparent px-3 py-2"
                    contentClassName="min-h-[120px] text-sm leading-relaxed text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-foreground"
                />
            </div>

            <div className="grid gap-2">
                <Label className="font-normal">Schedule</Label>
                <Select
                    value={values.scheduleKind}
                    onValueChange={(value) =>
                        setField("scheduleKind", value as TaskFormValues["scheduleKind"])
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="No schedule" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No schedule</SelectItem>
                        <SelectItem value="once">One-off</SelectItem>
                        <SelectItem value="interval">Recurring interval</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {values.scheduleKind !== "none" ? (
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label className="font-normal" htmlFor="task-next-run-at">Next run at</Label>
                        <Input
                            id="task-next-run-at"
                            type="datetime-local"
                            value={values.nextRunAt}
                            onChange={(event) => setField("nextRunAt", event.target.value)}
                        />
                    </div>
                    {values.scheduleKind === "interval" ? (
                        <div className="grid gap-2">
                            <Label className="font-normal" htmlFor="task-interval-seconds">Interval seconds</Label>
                            <Input
                                id="task-interval-seconds"
                                type="number"
                                min={1}
                                value={values.intervalSeconds}
                                onChange={(event) => setField("intervalSeconds", event.target.value)}
                                placeholder="3600"
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="grid gap-2">
                <Label className="font-normal" htmlFor="task-priority">Priority</Label>
                <Select
                    value={values.priority}
                    onValueChange={(value) => setField("priority", value as TaskFormValues["priority"])}
                >
                    <SelectTrigger id="task-priority" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                    <Label className="font-normal">Attachments</Label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                            onFilesChange(Array.from(event.target.files || []));
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 font-normal"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <IconPaperclip size={13} stroke={1.9} />
                        Add files
                    </Button>
                </div>
                {files.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {files.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs text-foreground/80"
                            >
                                <span className="max-w-[220px] truncate">{file.name}</span>
                                <button
                                    type="button"
                                    className="text-muted-foreground/60 transition-colors hover:text-foreground"
                                    onClick={() => {
                                        onFilesChange((current) => current.filter((_, itemIndex) => itemIndex !== index));
                                    }}
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <IconX size={11} stroke={2} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
