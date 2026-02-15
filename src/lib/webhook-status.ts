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
	if (status === "success") return "bg-green-500/10 text-green-500 border-green-500/20"
	if (status === "failed") return "bg-red-500/10 text-red-500 border-red-500/20"
	if (status === "filtered") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
	return "bg-muted text-muted-foreground border-border/40"
}

export function webhookStatusDotClass(status: NormalizedWebhookStatus): string {
	if (status === "success") return "bg-green-500"
	if (status === "failed") return "bg-orange-500"
	if (status === "filtered") return "bg-yellow-500"
	return "bg-slate-500"
}
