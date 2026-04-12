"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Underline as UnderlineIcon,
    Pilcrow,
} from "lucide-react";
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
import type { ActorProject, Agent } from "@wacht/types";
import { cn } from "@/lib/utils";

type ProjectValues = {
	name: string;
	agent_id: string;
	description: string;
};

function emptyValues(): ProjectValues {
	return {
		name: "",
		agent_id: "",
		description: "",
	};
}

function valuesFromProject(project: ActorProject): ProjectValues {
	return {
		name: project.name,
		agent_id: "",
		description: project.description || "",
	};
}

const markdownRenderer = new MarkdownIt({
    breaks: true,
    linkify: true,
});

const markdownSerializer = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    headingStyle: "atx",
});

function normalizeMarkdown(value: string) {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    return trimmed;
}

function looksLikeHTML(value: string) {
    const trimmed = value.trim();
    return /^<([a-z][a-z0-9]*)\b[^>]*>/i.test(trimmed);
}

function markdownToEditorHTML(value: string) {
    const normalized = normalizeMarkdown(value);
    if (!normalized) return "<p></p>";
    if (looksLikeHTML(normalized)) return normalized;
    return markdownRenderer.render(normalized);
}

function editorHTMLToMarkdown(value: string) {
    const trimmed = value.trim();
    if (
        trimmed === "" ||
        trimmed === "<p></p>" ||
        trimmed === "<p><br></p>"
    ) {
        return "";
    }

    return normalizeMarkdown(markdownSerializer.turndown(trimmed));
}

function ToolbarButton({
    active,
    onClick,
    label,
    children,
}: {
    active?: boolean;
    onClick: () => void;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onMouseDown={(event) => {
                event.preventDefault();
                onClick();
            }}
            className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border transition-colors",
                active
                    ? "bg-accent/50 text-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground",
            )}
            aria-label={label}
            title={label}
        >
            {children}
        </button>
    );
}

function ProjectBriefEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
            }),
            Underline,
            Placeholder.configure({
                placeholder:
                    "Describe the project, goals, constraints, context, and what success looks like.",
            }),
        ],
        content: markdownToEditorHTML(value),
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm prose-invert max-w-none min-h-32 px-3 py-3 text-foreground outline-none " +
                    "prose-p:my-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 " +
                    "prose-strong:text-foreground prose-em:text-foreground prose-headings:text-foreground " +
                    "prose-p:text-foreground prose-li:text-foreground prose-a:text-foreground",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editorHTMLToMarkdown(editor.getHTML()));
        },
    });

    React.useEffect(() => {
        if (!editor) return;
        const currentMarkdown = editorHTMLToMarkdown(editor.getHTML());
        const nextMarkdown = normalizeMarkdown(value);
        if (currentMarkdown !== nextMarkdown) {
            const nextHTML = markdownToEditorHTML(nextMarkdown);
            editor.commands.setContent(nextHTML, {
                emitUpdate: false,
            });
        }
    }, [editor, value]);

    return (
        <div className="overflow-hidden rounded-md border border-border bg-background">
            <div className="flex items-center gap-1 border-b border-border px-2 py-2">
                <ToolbarButton
                    label="Paragraph"
                    active={editor?.isActive("paragraph")}
                    onClick={() => editor?.chain().focus().setParagraph().run()}
                >
                    <Pilcrow size={14} />
                </ToolbarButton>
                <ToolbarButton
                    label="Bold"
                    active={editor?.isActive("bold")}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                    <Bold size={14} />
                </ToolbarButton>
                <ToolbarButton
                    label="Italic"
                    active={editor?.isActive("italic")}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                    <Italic size={14} />
                </ToolbarButton>
                <ToolbarButton
                    label="Underline"
                    active={editor?.isActive("underline")}
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                >
                    <UnderlineIcon size={14} />
                </ToolbarButton>
                <ToolbarButton
                    label="Bullet list"
                    active={editor?.isActive("bulletList")}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                    <List size={14} />
                </ToolbarButton>
                <ToolbarButton
                    label="Numbered list"
                    active={editor?.isActive("orderedList")}
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered size={14} />
                </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

function ProjectForm({
	values,
	onChange,
	agents,
}: {
	values: ProjectValues;
	onChange: React.Dispatch<React.SetStateAction<ProjectValues>>;
	agents?: Agent[];
}) {
	return (
		<div className="grid gap-4 py-2">
			<div className="grid gap-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                    id="project-name"
                    value={values.name}
                    onChange={(event) =>
                        onChange((current) => ({ ...current, name: event.target.value }))
                    }
					placeholder="Launch planning"
				/>
			</div>
			{agents && agents.length > 0 ? (
				<div className="grid gap-2">
					<Label>Agent</Label>
					<Select
						value={values.agent_id}
						onValueChange={(value) =>
							onChange((current) => ({ ...current, agent_id: value }))
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select an agent" />
						</SelectTrigger>
						<SelectContent>
							{agents.map((agent) => (
								<SelectItem key={agent.id} value={agent.id}>
									{agent.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}
			<div className="grid gap-2">
				<Label htmlFor="project-brief">Project brief</Label>
                <ProjectBriefEditor
                    value={values.description}
                    onChange={(nextValue) =>
                        onChange((current) => ({
                            ...current,
                            description: nextValue,
                        }))
                    }
                />
            </div>
        </div>
    );
}

export function CreateProjectDialog({
	trigger,
	agents,
	onCreate,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: {
	trigger?: React.ReactNode | null;
	agents: Agent[];
	onCreate: (request: { name: string; agent_id: string; description?: string }) => Promise<void>;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [values, setValues] = React.useState<ProjectValues>(emptyValues);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

    React.useEffect(() => {
        if (!open) setValues(emptyValues());
    }, [open]);

	const submit = async () => {
		if (!values.name.trim() || !values.agent_id) return;
		setSubmitting(true);
		try {
			await onCreate({
				name: values.name.trim(),
				agent_id: values.agent_id,
				description: values.description.trim() || undefined,
			});
			setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger !== null ? (
                <DialogTrigger asChild>
                    {trigger || <Button>New project</Button>}
                </DialogTrigger>
            ) : null}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create project</DialogTitle>
                    <DialogDescription>
                        Threads always live inside a project.
                    </DialogDescription>
                </DialogHeader>
	                <ProjectForm values={values} onChange={setValues} agents={agents} />
	                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
	                    <Button disabled={submitting || !values.name.trim() || !values.agent_id} onClick={submit}>
	                        {submitting ? "Creating..." : "Create project"}
	                    </Button>
	                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function EditProjectDialog({
    project,
    trigger,
    onUpdate,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
}: {
    project: ActorProject;
    trigger?: React.ReactNode;
    onUpdate: (request: { name?: string; description?: string }) => Promise<void>;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [values, setValues] = React.useState<ProjectValues>(() => valuesFromProject(project));
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

    React.useEffect(() => {
        setValues(valuesFromProject(project));
    }, [project]);

    const submit = async () => {
        if (!values.name.trim()) return;
        setSubmitting(true);
        try {
            await onUpdate({
                name: values.name.trim(),
                description: values.description.trim() || undefined,
            });
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Edit project</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit project</DialogTitle>
                    <DialogDescription>
                        Update the project name and brief.
                    </DialogDescription>
                </DialogHeader>
                <ProjectForm values={values} onChange={setValues} />
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button disabled={submitting || !values.name.trim()} onClick={submit}>
                        {submitting ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
