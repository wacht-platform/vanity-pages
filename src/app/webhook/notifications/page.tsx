"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWebhookApp } from "@/components/webhook-provider";
import { toast } from "sonner";

function splitEmails(value: string): string[] {
	return value
		.split(/\r?\n|,/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export default function WebhookNotificationsPage() {
	const { webhookApp, updateSettings, reload } = useWebhookApp();
	const [emailsText, setEmailsText] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const current = webhookApp?.failure_notification_emails || [];
		setEmailsText(current.join("\n"));
	}, [webhookApp?.failure_notification_emails]);

	const parsedEmails = useMemo(() => splitEmails(emailsText), [emailsText]);

	const handleSave = async () => {
		setSaving(true);
		try {
			await updateSettings({
				failure_notification_emails: parsedEmails,
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
		<div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">
			<section className="border border-border/30 rounded-xl overflow-hidden">
				<div className="px-4 py-3 border-b border-border/20 text-sm font-normal text-foreground">
					Failure Notification Emails
				</div>
				<div className="p-4 space-y-4">
					<p className="text-sm text-muted-foreground">
						Add recipients to be notified when webhook endpoint failures trigger alerts. Enter one email per line.
					</p>
					<Textarea
						value={emailsText}
						onChange={(e) => setEmailsText(e.target.value)}
						placeholder={"alerts@example.com\noncall@example.com"}
						className="min-h-40"
					/>
					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							{parsedEmails.length} recipient{parsedEmails.length === 1 ? "" : "s"}
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
