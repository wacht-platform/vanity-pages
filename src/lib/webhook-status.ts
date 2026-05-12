export type NormalizedWebhookStatus = "success" | "failed" | "filtered" | "pending"

export function normalizeWebhookStatus(rawStatus?: string, statusCode?: number): NormalizedWebhookStatus {
	const status = (rawStatus || "").toLowerCase()
	if (status === "success") return "success"
	if (status === "failed" || status === "permanently_failed") return "failed"
	if (status === "filtered") return "filtered"
	if (status === "endpoint_disabled" || status === "deactivated") return "failed"
	if (status === "pending") return "pending"

	const code = statusCode ?? 0
	if (code >= 200 && code < 300) return "success"
	if (code >= 400) return "failed"
	return "pending"
}

export function webhookStatusLabel(status: NormalizedWebhookStatus): string {
	if (status === "success") return "Success"
	if (status === "failed") return "Failed"
	if (status === "filtered") return "Filtered"
	return "Pending"
}

export function webhookStatusBadgeClass(status: NormalizedWebhookStatus): string {
	if (status === "success") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
	if (status === "failed") return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
	if (status === "filtered") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
	return "bg-muted text-muted-foreground border-border/60"
}

export function webhookStatusDotClass(status: NormalizedWebhookStatus): string {
	if (status === "success") return "bg-emerald-500"
	if (status === "failed") return "bg-rose-500"
	if (status === "filtered") return "bg-amber-500"
	return "bg-muted-foreground"
}
