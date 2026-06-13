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
	if (status === "success") return "bg-success-soft text-success border-success/30"
	if (status === "failed") return "bg-error-soft text-error border-error/30"
	if (status === "filtered") return "bg-warning-soft text-warning border-warning/30"
	return "bg-muted text-muted-foreground border-border/60"
}

export function webhookStatusDotClass(status: NormalizedWebhookStatus): string {
	if (status === "success") return "bg-success"
	if (status === "failed") return "bg-error"
	if (status === "filtered") return "bg-warning"
	return "bg-muted-foreground"
}
