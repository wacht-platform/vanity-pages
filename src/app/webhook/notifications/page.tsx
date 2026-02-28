"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWebhookApp } from "@/components/webhook-provider";
import { toast } from "sonner";
import { X } from "lucide-react";

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
		<div className="w-full px-4 pb-6 pt-0 md:px-6 md:pb-8 md:pt-0">
			<section className="w-full border border-border/30 rounded-xl overflow-hidden bg-card/40">
				<div className="px-4 py-3 border-b border-border/20 text-sm font-normal text-foreground">
					Failure Notification Emails
				</div>
				<div className="p-4 space-y-3">
					<div className="flex w-full items-center gap-2">
						<input
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addDraftEmails();
								}
							}}
							placeholder="alerts@example.com, oncall@example.com"
							className="h-9 w-full rounded-md border border-border/40 bg-background px-3 text-sm outline-none transition-colors focus:border-border"
						/>
						<Button
							type="button"
							variant="secondary"
							className="h-9 px-3"
							onClick={addDraftEmails}
							disabled={parsedDraftEmails.length === 0}
						>
							Add
						</Button>
					</div>

					<div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border/30 bg-background/70 p-2">
						{emails.length === 0 ? (
							<span className="px-1 text-xs text-muted-foreground">
								No recipients added yet.
							</span>
						) : (
							emails.map((email) => (
								<div
									key={email}
									className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-xs text-foreground"
								>
									<span>{email}</span>
									<button
										type="button"
										onClick={() => removeEmail(email)}
										className="text-muted-foreground transition-colors hover:text-foreground"
										aria-label={`Remove ${email}`}
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							))
						)}
					</div>

					<div className="flex items-center justify-between gap-3 pt-1">
						<p className="text-xs text-muted-foreground">
							{emails.length} recipient{emails.length === 1 ? "" : "s"}
						</p>
						<Button onClick={handleSave} disabled={saving}>
							{saving ? "Saving..." : "Save Recipients"}
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
