"use client";

import * as React from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, AgentThread, CreateAgentThreadRequest, UpdateAgentThreadRequest } from "@wacht/types";

type ThreadFormValues = {
	title: string;
	agent_id: string;
	thread_purpose: string;
	responsibility: string;
	system_instructions: string;
	reusable: boolean;
	accepts_assignments: boolean;
};

function defaultCreateValues(): ThreadFormValues {
	return {
		title: "",
		agent_id: "",
		thread_purpose: "execution",
		responsibility: "",
		system_instructions: "",
        reusable: true,
        accepts_assignments: true,
    };
}

type CreateThreadDialogProps = {
	agents: Agent[];
	onCreate: (request: CreateAgentThreadRequest) => Promise<void>;
	trigger?: React.ReactNode;
};

export function CreateThreadDialog({
	agents,
	onCreate,
	trigger,
}: CreateThreadDialogProps) {
	const [open, setOpen] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);
	const [values, setValues] = React.useState<ThreadFormValues>(() =>
		defaultCreateValues(),
	);

	React.useEffect(() => {
		if (!open) {
			setValues(defaultCreateValues());
		}
	}, [open]);

	const submit = async () => {
		if (!values.title.trim() || !values.agent_id) return;
		setSubmitting(true);
		try {
			await onCreate({
				title: values.title.trim(),
				agent_id: values.agent_id,
				thread_purpose: values.thread_purpose,
				responsibility: values.responsibility.trim() || undefined,
				system_instructions: values.system_instructions.trim() || undefined,
                reusable: values.reusable,
                accepts_assignments: values.accepts_assignments,
            });
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

		return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>New thread</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Thread</DialogTitle>
                    <DialogDescription>
                        Create a user-facing conversation or an internal work lane.
                    </DialogDescription>
                </DialogHeader>
				<ThreadForm values={values} onChange={setValues} agents={agents} />
				<DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
					<Button disabled={submitting || !values.title.trim() || !values.agent_id} onClick={submit}>
						{submitting ? "Creating..." : "Create thread"}
					</Button>
				</DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type EditThreadDialogProps = {
	thread: AgentThread;
	agents: Agent[];
	onUpdate: (request: UpdateAgentThreadRequest) => Promise<void>;
};

type EditThreadFormValues = {
	title: string;
	agent_id: string;
	system_instructions: string;
};

function editValuesFromThread(thread: AgentThread): EditThreadFormValues {
	return {
		title: thread.title || "",
		agent_id: thread.agent_id || "",
		system_instructions: thread.system_instructions || "",
	};
}

export function EditThreadDialog({ thread, agents, onUpdate }: EditThreadDialogProps) {
	const [open, setOpen] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);
	const [values, setValues] = React.useState<EditThreadFormValues>(() =>
		editValuesFromThread(thread),
	);

	React.useEffect(() => {
		setValues(editValuesFromThread(thread));
	}, [thread]);

	const submit = async () => {
		if (!values.title.trim() || !values.agent_id) return;
		setSubmitting(true);
		try {
			await onUpdate({
				title: values.title.trim(),
				agent_id: values.agent_id,
				system_instructions: values.system_instructions.trim() || undefined,
			});
            setOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Edit thread</Button>
            </DialogTrigger>
	            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Thread</DialogTitle>
                    <DialogDescription>
                        Update the thread title and stable system instructions.
                    </DialogDescription>
                </DialogHeader>
	                <div className="grid gap-4 py-2">
	                    <div className="grid gap-2">
	                        <Label htmlFor="edit-thread-title">Title</Label>
                        <Input
                            id="edit-thread-title"
                            value={values.title}
                            onChange={(event) =>
                                setValues((current) => ({
                                    ...current,
                                    title: event.target.value,
                                }))
                            }
                            placeholder="Research lane, Marketing review, User conversation"
	                        />
	                    </div>

	                    <div className="grid gap-2">
	                        <Label>Agent</Label>
	                        <Select
	                            value={values.agent_id}
	                            onValueChange={(value) =>
	                                setValues((current) => ({
	                                    ...current,
	                                    agent_id: value,
	                                }))
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

	                    <div className="grid gap-2">
                        <Label htmlFor="edit-thread-system-instructions">
                            System Instructions
                        </Label>
                        <Textarea
                            id="edit-thread-system-instructions"
                            value={values.system_instructions}
                            onChange={(event) =>
                                setValues((current) => ({
                                    ...current,
                                    system_instructions: event.target.value,
                                }))
                            }
                            placeholder="Stable instructions for this thread."
                            className="min-h-28"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
	                    <Button disabled={submitting || !values.title.trim() || !values.agent_id} onClick={submit}>
	                        {submitting ? "Saving..." : "Save changes"}
	                    </Button>
	                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ThreadForm({
	values,
	onChange,
	agents,
}: {
	values: ThreadFormValues;
	onChange: React.Dispatch<React.SetStateAction<ThreadFormValues>>;
	agents: Agent[];
}) {
    const setField = <K extends keyof ThreadFormValues>(
        key: K,
        value: ThreadFormValues[K],
    ) => {
        onChange((current) => ({ ...current, [key]: value }));
    };

    return (
        <div className="grid gap-4 py-2">
            <div className="grid gap-2">
                <Label htmlFor="thread-title">Title</Label>
                <Input
                    id="thread-title"
                    value={values.title}
                    onChange={(event) => setField("title", event.target.value)}
                    placeholder="Research lane, Marketing review, User conversation"
                />
            </div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="grid gap-2">
					<Label>Purpose</Label>
                    <Select
                        value={values.thread_purpose}
                        onValueChange={(value) => setField("thread_purpose", value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="conversation">Conversation</SelectItem>
                            <SelectItem value="coordinator">Coordinator</SelectItem>
                            <SelectItem value="execution">Execution</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid gap-2">
					<Label>Agent</Label>
					<Select
						value={values.agent_id}
						onValueChange={(value) => setField("agent_id", value)}
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
			</div>

            <div className="grid gap-2">
                <Label htmlFor="thread-responsibility">Responsibility</Label>
                <Input
                    id="thread-responsibility"
                    value={values.responsibility}
                    onChange={(event) => setField("responsibility", event.target.value)}
                    placeholder="What this lane is responsible for"
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="thread-system-instructions">System Instructions</Label>
                <Textarea
                    id="thread-system-instructions"
                    value={values.system_instructions}
                    onChange={(event) =>
                        setField("system_instructions", event.target.value)
                    }
                    placeholder="Stable role-level instructions for this reusable thread."
                    className="min-h-28"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-3">
                    <div>
                        <div className="text-sm font-medium">Reusable</div>
                        <div className="text-xs text-muted-foreground">
                            Keep this thread as a standing reusable lane.
                        </div>
                    </div>
                    <Switch
                        checked={values.reusable}
                        onCheckedChange={(checked) => setField("reusable", checked)}
                    />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-3">
                    <div>
                        <div className="text-sm font-medium">Accept Assignments</div>
                        <div className="text-xs text-muted-foreground">
                            Allow staged project task assignments to route here.
                        </div>
                    </div>
                    <Switch
                        checked={values.accepts_assignments}
                        onCheckedChange={(checked) =>
                            setField("accepts_assignments", checked)
                        }
                    />
                </div>
            </div>
        </div>
    );
}
