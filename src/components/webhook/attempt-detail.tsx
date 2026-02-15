"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
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

export function AttemptDetail({
	details,
	isExpanded,
	onToggle,
	getStatusColor,
	enableCurlCopy = false,
}: Props) {
	const [requestExpanded, setRequestExpanded] = useState(true)
	const [responseExpanded, setResponseExpanded] = useState(true)

	const attemptStatusColor = getStatusColor(details.http_status_code || 0)

	return (
		<div className="transition-all">
			<div
				className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/5 transition-colors"
				onClick={onToggle}
			>
				<div className="flex items-center gap-3">
					<div className={cn("w-1.5 h-1.5 rounded-full", attemptStatusColor)} />
					<span className="text-xs font-normal text-foreground">Attempt #{details.attempt_number}</span>
					<span className="text-xs text-muted-foreground/50">{new Date(details.timestamp).toLocaleTimeString()}</span>
				</div>
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-4 text-xs text-muted-foreground/60">
						<span className="font-normal">Status: <span className="text-foreground/80 tabular-nums">{details.http_status_code || "---"}</span></span>
						<span className="font-normal">Time: <span className="text-foreground/80 tabular-nums">{details.response_time_ms ? `${details.response_time_ms}ms` : "---"}</span></span>
					</div>
					{isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground/40" /> : <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
				</div>
			</div>

			{isExpanded && (
				<div className="py-6 border-t border-border/5">
					<div className="space-y-6">
						{details.error_message && (
							<div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
								<div className="text-xs uppercase font-normal text-red-500/60 mb-2">Error Detail</div>
								<div className="text-xs text-red-600/80 dark:text-red-400/80 font-normal leading-relaxed">
									{details.error_message}
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<div
									className="flex items-center justify-between cursor-pointer group/header"
									onClick={() => setRequestExpanded(!requestExpanded)}
								>
									<div className="flex items-center gap-2">
										<ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", !requestExpanded && "-rotate-90")} />
										<h4 className="text-xs uppercase font-normal text-muted-foreground/60 group-hover/header:text-muted-foreground transition-colors">Request Context</h4>
									</div>
									{requestExpanded ? (
										<Button
											variant="ghost"
											className="h-5 text-xs text-primary/50 hover:text-primary hover:bg-transparent p-0"
											onClick={(e) => {
												e.stopPropagation()
												navigator.clipboard.writeText(
													enableCurlCopy
														? buildCurlCommand(details)
														: JSON.stringify(parsePayload(details.payload), null, 2),
												)
											}}
										>
											{enableCurlCopy ? "Copy curl" : "Copy"}
										</Button>
									) : null}
								</div>

								{requestExpanded && (
									<div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
										{details.request_headers && (
											<div className="rounded-xl border border-border/10 bg-muted/5 p-3">
												<div className="text-xs text-muted-foreground/80 uppercase mb-2 tracking-widest font-normal">Headers</div>
												<JsonViewer data={parsePayload(details.request_headers)} />
											</div>
										)}

										<div className="rounded-xl border border-border/10 bg-muted/5 p-3">
											<div className="text-xs text-muted-foreground/80 uppercase mb-2 font-normal">Payload</div>
											<JsonViewer data={parsePayload(details.payload)} />
										</div>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<div
									className="flex items-center justify-between cursor-pointer group/header"
									onClick={() => setResponseExpanded(!responseExpanded)}
								>
									<div className="flex items-center gap-2">
										<ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform", !responseExpanded && "-rotate-90")} />
										<h4 className="text-xs uppercase font-normal text-muted-foreground/60 group-hover/header:text-muted-foreground transition-colors">Response Context</h4>
									</div>
								</div>

								{responseExpanded && (
									<div className="rounded-xl border border-border/10 bg-muted/5 p-3 min-h-[100px] animate-in slide-in-from-top-1 duration-200">
										{details.response_headers || details.response_body ? (
											<div className="space-y-4">
												{details.response_headers && (
													<div>
														<div className="text-xs text-muted-foreground/80 uppercase mb-2 font-normal">Headers</div>
														<JsonViewer data={parsePayload(details.response_headers)} />
													</div>
												)}
												{details.response_body && (
													<div className={details.response_headers ? "pt-4 border-t border-border/5" : ""}>
														<div className="text-xs text-muted-foreground/80 uppercase mb-2 font-normal">Body</div>
														<JsonViewer data={parsePayload(details.response_body)} />
													</div>
												)}
											</div>
										) : (
											<div className="h-full flex items-center justify-center py-10">
												<p className="text-xs text-muted-foreground/30 italic font-normal">No response data captured</p>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
