"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebhookApp } from "@/components/webhook-provider";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

function splitEmails(value: string): string[] {
	return value
		.split(/\r?\n|,/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export default function WebhookNotificationsPage() {
	const { webhookApp, updateSettings, reload } = useWebhookApp();
	const [emails, setEmails] = useState<string[]>([]);
	const [draft, setDraft] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const current = webhookApp?.failure_notification_emails || [];
		setEmails(current);
	}, [webhookApp?.failure_notification_emails]);

	const parsedDraftEmails = useMemo(() => splitEmails(draft), [draft]);

	const addDraftEmails = () => {
		if (parsedDraftEmails.length === 0) return;
		setEmails((prev) => {
			const next = new Set(prev);
			for (const email of parsedDraftEmails) next.add(email);
			return Array.from(next);
		});
		setDraft("");
	};

	const removeEmail = (email: string) => {
		setEmails((prev) => prev.filter((value) => value !== email));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await updateSettings({
				failure_notification_emails: emails,
			});
			await reload();
			toast.success("Notification recipients updated");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to update notification recipients";
			toast.error(message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
			<div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row">
				<div className="min-w-0">
					<div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
						Webhooks
					</div>
					<h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
						Notifications
					</h1>
					<p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
						Decide who hears about it when your endpoints start failing.
					</p>
				</div>
				<Button size="sm" className="h-[30px] shrink-0" onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save changes"}
				</Button>
			</div>

			<section className="rounded-[10px] border border-border bg-card p-[22px]">
				<div className="mb-3.5 flex items-start justify-between gap-4">
					<div>
						<h3 className="text-[14px] font-medium leading-[1.2] text-foreground">
							Failure alert recipients
						</h3>
						<p className="mt-1 text-[12px] text-muted-foreground">
							Email these addresses when an endpoint exhausts its retry budget.
						</p>
					</div>
					<span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-2 font-mono text-[11px] font-medium text-muted-foreground">
						<span className="size-1.5 rounded-full bg-muted-foreground/40" />
						{emails.length} recipient{emails.length === 1 ? "" : "s"}
					</span>
				</div>

				<div className="mb-3 flex items-center gap-2">
					<Input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								addDraftEmails();
							}
						}}
						placeholder="alerts@example.com, oncall@example.com"
						className="h-[30px] flex-1 text-[12px]"
					/>
					<Button
						size="sm"
						className="h-[30px] shrink-0"
						onClick={addDraftEmails}
						disabled={parsedDraftEmails.length === 0}
					>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						Add
					</Button>
				</div>

				{emails.length === 0 ? (
					<div className="rounded-[6px] border border-dashed border-input bg-secondary/50 px-4 py-[18px] text-center text-[12px] leading-[1.5] text-muted-foreground">
						No recipients added yet. Failures will surface in the dashboard only.
					</div>
				) : (
					<div className="flex flex-wrap gap-2">
						{emails.map((email) => (
							<span
								key={email}
								className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-secondary px-2.5 py-1 font-mono text-[12px] text-foreground/80"
							>
								{email}
								<button
									type="button"
									onClick={() => removeEmail(email)}
									className="text-muted-foreground transition-colors hover:text-foreground"
									aria-label={`Remove ${email}`}
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
