"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { JsonViewer } from "@/components/json-viewer"
import type { WebhookDeliveryDetail } from "@wacht/types"

type Props = {
	details: WebhookDeliveryDetail
	isExpanded: boolean
	onToggle: () => void
	getStatusColor: (status: number) => string
	enableCurlCopy?: boolean
}

function parsePayload(payload: unknown) {
	if (typeof payload === "string") {
		try {
			return JSON.parse(payload)
		} catch {
			return payload
		}
	}
	return payload
}

function shellEscape(value: string) {
	return value.replace(/'/g, "'\\''")
}

function buildCurlCommand(details: WebhookDeliveryDetail) {
	const parsedHeaders = parsePayload(details.request_headers)
	const headers =
		parsedHeaders && typeof parsedHeaders === "object" && !Array.isArray(parsedHeaders)
			? (parsedHeaders as Record<string, unknown>)
			: {}
	const payloadData = parsePayload(details.payload)
	const payloadString =
		typeof payloadData === "string" ? payloadData : JSON.stringify(payloadData ?? {}, null, 2)

	const headerArgs = Object.entries(headers)
		.map(([key, val]) => `-H '${shellEscape(key)}: ${shellEscape(String(val))}'`)
		.join(" ")

	return `curl -X POST 'https://your-endpoint-url' ${headerArgs} --data '${shellEscape(payloadString)}'`
}

const LBL = "font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
const JSON_BLOCK = "overflow-x-auto rounded-[6px] border border-border bg-secondary/40 px-3.5 py-3"

function statusPillClass(code: number) {
	if (code >= 200 && code < 300) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
	if (code >= 500) return "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
	if (code >= 400) return "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
	return "border-border bg-secondary text-muted-foreground"
}

export function AttemptDetail({
	details,
	isExpanded,
	onToggle,
	getStatusColor,
	enableCurlCopy = false,
}: Props) {
	const [requestExpanded, setRequestExpanded] = useState(true)
	const [responseExpanded, setResponseExpanded] = useState(true)
	const [copied, setCopied] = useState(false)

	const code = details.http_status_code || 0
	const ok = code >= 200 && code < 300
	const attemptDotColor = getStatusColor(code)

	const copyRequest = (e: React.MouseEvent) => {
		e.stopPropagation()
		navigator.clipboard.writeText(
			enableCurlCopy
				? buildCurlCommand(details)
				: JSON.stringify(parsePayload(details.payload), null, 2),
		)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="overflow-hidden rounded-[8px] border border-border bg-card">
			{/* Compact attempt header */}
			<div
				className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
				onClick={onToggle}
			>
				<div className="flex min-w-0 items-center gap-2.5">
					<span className={cn("size-1.5 shrink-0 rounded-full", attemptDotColor)} />
					<span className="text-[13px] font-medium text-foreground">Attempt #{details.attempt_number}</span>
					<span className="font-mono text-[11px] text-muted-foreground">{new Date(details.timestamp).toLocaleTimeString()}</span>
				</div>
				<div className="flex shrink-0 items-center gap-2.5">
					<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">Status</span>
					<span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium tabular-nums", statusPillClass(code))}>
						<span className={cn("size-1.5 rounded-full", attemptDotColor)} />
						{code || "—"}
					</span>
					<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">Time</span>
					<span className="inline-flex items-center rounded-[3px] border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-foreground/80">
						{details.response_time_ms ? `${details.response_time_ms} ms` : "—"}
					</span>
					{isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
				</div>
			</div>

			{isExpanded && (
				<div className="grid grid-cols-1 gap-4 border-t border-border p-4 md:grid-cols-2">
					{/* Request */}
					<div className="overflow-hidden rounded-[8px] border border-border">
						<div
							className="flex cursor-pointer items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2.5"
							onClick={() => setRequestExpanded(!requestExpanded)}
						>
							<ChevronDown className={cn("h-3 w-3 text-muted-foreground/60 transition-transform", !requestExpanded && "-rotate-90")} />
							<span className={LBL}>Request context</span>
							<div className="flex-1" />
							{requestExpanded && (
								<Button variant="outline" size="sm" className="h-6 gap-1.5 px-2 text-[11px]" onClick={copyRequest}>
									{copied ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
									{enableCurlCopy ? "Copy curl" : "Copy"}
								</Button>
							)}
						</div>
						{requestExpanded && (
							<div className="space-y-3.5 p-3.5">
								{details.request_headers && (
									<div>
										<div className={cn(LBL, "mb-1.5")}>Headers</div>
										<div className={JSON_BLOCK}>
											<JsonViewer data={parsePayload(details.request_headers)} />
										</div>
									</div>
								)}
								<div>
									<div className={cn(LBL, "mb-1.5")}>Payload</div>
									<div className={JSON_BLOCK}>
										<JsonViewer data={parsePayload(details.payload)} />
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Response */}
					<div className="overflow-hidden rounded-[8px] border border-border">
						<div
							className="flex cursor-pointer items-center gap-2 border-b border-border bg-secondary/40 px-3 py-2.5"
							onClick={() => setResponseExpanded(!responseExpanded)}
						>
							<ChevronDown className={cn("h-3 w-3 text-muted-foreground/60 transition-transform", !responseExpanded && "-rotate-90")} />
							<span className={LBL}>Response context</span>
							<div className="flex-1" />
							<span className={cn("inline-flex h-[22px] items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium tabular-nums", statusPillClass(code))}>
								<span className={cn("size-1.5 rounded-full", attemptDotColor)} />
								{code || "—"}
							</span>
						</div>
						{responseExpanded && (
							<div className="space-y-3.5 p-3.5">
								{details.response_headers && (
									<div>
										<div className={cn(LBL, "mb-1.5")}>Response headers</div>
										<div className={JSON_BLOCK}>
											<JsonViewer data={parsePayload(details.response_headers)} />
										</div>
									</div>
								)}
								<div>
									<div className={cn(LBL, "mb-1.5")}>Response body</div>
									{details.response_body ? (
										<div className={JSON_BLOCK}>
											<JsonViewer data={parsePayload(details.response_body)} />
										</div>
									) : (
										<div className="rounded-[6px] border border-border bg-secondary/40 px-3.5 py-3 font-mono text-[12px] italic text-muted-foreground">
											No response body captured.
										</div>
									)}
								</div>

								{details.error_message ? (
									<div className="flex items-start gap-2 rounded-[6px] bg-destructive/10 px-3 py-2.5 text-[12px] leading-relaxed text-destructive">
										<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
										<span>{details.error_message}</span>
									</div>
								) : ok ? (
									<div className="flex items-start gap-2 rounded-[6px] bg-emerald-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-emerald-600 dark:text-emerald-400">
										<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
										<span>
											Delivered{details.response_time_ms ? ` in ${details.response_time_ms} ms` : ""} · signature verified
										</span>
									</div>
								) : null}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
