"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react"
import { useWebhookDeliveries, useWebhookEndpoints, useWebhookEvents } from "@wacht/nextjs"
import { useWebhookApp } from "@/components/webhook-provider"
import type {
	EndpointWithSubscriptions,
	ReplayWebhookDeliveryOptions,
	WebhookAppEvent,
	WebhookDeliveryDetail,
} from "@wacht/types"
import { normalizeWebhookStatus, webhookStatusBadgeClass, webhookStatusDotClass, webhookStatusLabel } from "@/lib/webhook-status"
import { getReplayErrorDescription } from "@/lib/webhook-replay-error"
import { toast } from "sonner"
import { WebhookLogControls } from "@/components/webhook/log-controls"
import { AttemptDetail } from "@/components/webhook/attempt-detail"
import { useReplayJobs } from "@/hooks/use-replay-jobs"

type DeliveryRow = {
	id: string
	created_at?: string
	status?: string
	response_status?: number
	http_status_code?: number
	response_time_ms?: number
	event_type?: string
	event_name?: string
	endpoint_id?: string
	filtered_reason?: string
}

function toUtcIsoFromLocalDateTime(dateTimeStr: string): string {
	return new Date(dateTimeStr).toISOString()
}

export default function WebhookLogsPage() {
	const [page, setPage] = useState(1)
	const [limit] = useState(30)
	const [status, setStatus] = useState<string>("all")
	const [eventName, setEventName] = useState<string>("all")
	const [endpointId, setEndpointId] = useState<string>("all")
	const [replayStartDateTime, setReplayStartDateTime] = useState<string>("")
	const [replayEndDateTime, setReplayEndDateTime] = useState<string>("")
	const [replayStatus, setReplayStatus] = useState<string>("all")
	const [replayEventName, setReplayEventName] = useState<string>("all")
	const [replayEndpointId, setReplayEndpointId] = useState<string>("all")
	const [replayRangeLoading, setReplayRangeLoading] = useState(false)
	const [replayPopoverOpen, setReplayPopoverOpen] = useState(false)
	const [confirmReplayOpen, setConfirmReplayOpen] = useState(false)
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
	const [deliveryDetails, setDeliveryDetails] = useState<Record<string, WebhookDeliveryDetail[]>>({})
	const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})
	const [expandedAttempts, setExpandedAttempts] = useState<Record<string, number[]>>({})
	const [cursors, setCursors] = useState<string[]>([])
	const [replayingDeliveryIds, setReplayingDeliveryIds] = useState<string[]>([])
	const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([])
	const [replaySelectedLoading, setReplaySelectedLoading] = useState(false)
	const cursor = page > 1 ? cursors[page - 2] : undefined

	const { deliveries, has_more, next_cursor, loading, refetch: refetchDeliveries } = useWebhookDeliveries({
		limit,
		cursor,
		status: status === "all" ? undefined : status,
		event_name: eventName === "all" ? undefined : eventName,
		endpoint_id: endpointId === "all" ? undefined : endpointId,
	})

	const { endpoints } = useWebhookEndpoints()
	const { events } = useWebhookEvents()
	const { fetchDeliveryDetail, replayDelivery, fetchReplayTaskStatus, fetchReplayTasks, cancelReplayTask } = useWebhookApp()
	const {
		replayJobs,
		activeReplayCount,
		loadReplayJobs,
		pollReplayTask,
		handleCancelReplayTask,
	} = useReplayJobs({
		fetchReplayTaskStatus,
		fetchReplayTasks,
		cancelReplayTask,
		onTerminal: async () => {
			await refetchDeliveries()
		},
	})

	useEffect(() => {
		if (replayPopoverOpen) {
			void loadReplayJobs()
		}
	}, [replayPopoverOpen, loadReplayJobs])


	const getStatusColor = (statusCode: number) => {
		if (statusCode >= 200 && statusCode < 300) return "bg-success"
		if (statusCode >= 400 && statusCode < 500) return "bg-warning"
		if (statusCode >= 500) return "bg-error"
		return "bg-muted-foreground"
	}

	const handleRowExpand = async (deliveryId: string) => {
		if (expandedRowId === deliveryId) {
			setExpandedRowId(null)
			return
		}

		setExpandedRowId(deliveryId)

		// Fetch details if not already loaded
		if (!deliveryDetails[deliveryId]) {
			setLoadingDetails(prev => ({ ...prev, [deliveryId]: true }))
			try {
				const details = await fetchDeliveryDetail(deliveryId)
				// Sort details by attempt number descending (latest first)
				const sortedDetails = (Array.isArray(details) ? details : [details]).sort((a, b) => b.attempt_number - a.attempt_number)
				setDeliveryDetails(prev => ({ ...prev, [deliveryId]: sortedDetails }))
				// Auto-expand the latest attempt
				if (sortedDetails.length > 0) {
					setExpandedAttempts(prev => ({ ...prev, [deliveryId]: [sortedDetails[0].attempt_number] }))
				}
			} catch (error) {
				console.error("Failed to fetch delivery details:", error)
			} finally {
				setLoadingDetails(prev => ({ ...prev, [deliveryId]: false }))
			}
		}
	}

	const toggleAttemptExpand = (deliveryId: string, attemptNumber: number) => {
		setExpandedAttempts(prev => {
			const current = prev[deliveryId] || []
			if (current.includes(attemptNumber)) {
				return { ...prev, [deliveryId]: current.filter(n => n !== attemptNumber) }
			} else {
				// Close others if we want accordion behavior, but let's keep it allowing multiple open
				return { ...prev, [deliveryId]: [...current, attemptNumber] }
			}
		})
	}

	const handleReplayDelivery = async (deliveryId: string) => {
		setReplayingDeliveryIds(prev => [...prev, deliveryId])
		try {
			const options: ReplayWebhookDeliveryOptions = { delivery_ids: [deliveryId] }
			const result = await replayDelivery(options)
			if (result?.status === "queued") {
				toast.success("Replay queued", {
					description: result?.message || `Delivery ${deliveryId} replay request processed.`,
				})
			} else {
				toast("Replay update", {
					description: result?.message || `Delivery ${deliveryId} replay request processed.`,
				})
			}
			if (result?.task_id) {
				void pollReplayTask(result.task_id, `Replay ${deliveryId}`)
				void loadReplayJobs()
			}
		} catch (error) {
			console.error("Failed to replay delivery:", error)
			toast.error("Replay failed", {
				description: getReplayErrorDescription(error, "Could not replay this delivery."),
			})
		} finally {
			setReplayingDeliveryIds(prev => prev.filter(id => id !== deliveryId))
		}
	}

	const isDeliveryReplaying = (deliveryId: string) => replayingDeliveryIds.includes(deliveryId)
	const hasSelection = selectedDeliveryIds.length > 0

	const toggleDeliverySelection = (deliveryId: string) => {
		setSelectedDeliveryIds((prev) =>
			prev.includes(deliveryId)
				? prev.filter((id) => id !== deliveryId)
				: [...prev, deliveryId],
		)
	}

	const handleReplaySelected = async () => {
		if (selectedDeliveryIds.length === 0 || replaySelectedLoading) return
		setReplaySelectedLoading(true)
		try {
			const result = await replayDelivery({ delivery_ids: selectedDeliveryIds })
			if (result?.status === "queued") {
				toast.success("Replay queued", {
					description:
						result?.message ||
						`Queued replay for ${selectedDeliveryIds.length} selected deliveries.`,
				})
			} else {
				toast("Replay update", {
					description:
						result?.message ||
						`Replay request processed for ${selectedDeliveryIds.length} selected deliveries.`,
				})
			}
			if (result?.task_id) {
				void pollReplayTask(result.task_id, `Replay ${selectedDeliveryIds.length} deliveries`)
				void loadReplayJobs()
			}
			setSelectedDeliveryIds([])
		} catch (error) {
			console.error("Failed to replay selected deliveries:", error)
			toast.error("Replay failed", {
				description: getReplayErrorDescription(error, "Could not replay selected deliveries."),
			})
		} finally {
			setReplaySelectedLoading(false)
		}
	}

	const handleReplayByRange = async () => {
		if (!replayStartDateTime || replayRangeLoading) return
		if (replayEndDateTime && new Date(replayEndDateTime) < new Date(replayStartDateTime)) {
			toast.error("Invalid range", { description: "End date/time must be after start date/time." })
			return
		}
		setConfirmReplayOpen(true)
	}

	const confirmReplayByRange = async () => {
		if (!replayStartDateTime || replayRangeLoading) return
		if (replayEndDateTime && new Date(replayEndDateTime) < new Date(replayStartDateTime)) return
		setReplayRangeLoading(true)
		try {
			const options: ReplayWebhookDeliveryOptions = {
				start_date: toUtcIsoFromLocalDateTime(replayStartDateTime),
				end_date: replayEndDateTime ? toUtcIsoFromLocalDateTime(replayEndDateTime) : undefined,
				status: replayStatus === "all" ? undefined : replayStatus,
				event_name: replayEventName === "all" ? undefined : replayEventName,
				endpoint_id: replayEndpointId === "all" ? undefined : replayEndpointId,
			}
			const result = await replayDelivery(options)
			if (result?.status === "queued") {
				toast.success("Range replay queued", {
					description: result?.message || "Replay request processed for the selected range.",
				})
			} else {
				toast("Range replay update", {
					description: result?.message || "Replay request processed for the selected range.",
				})
			}
			if (result?.task_id) {
				void pollReplayTask(result.task_id, "Range replay")
				void loadReplayJobs()
			}
			setReplayPopoverOpen(false)
			setConfirmReplayOpen(false)
		} catch (error) {
			console.error("Failed to replay deliveries by range:", error)
			toast.error("Range replay failed", {
				description: getReplayErrorDescription(error, "Could not replay selected range."),
			})
		} finally {
			setReplayRangeLoading(false)
		}
	}

	const detailsList = expandedRowId ? deliveryDetails[expandedRowId] : null
	const isLoadingDetails = expandedRowId ? loadingDetails[expandedRowId] : false

	useEffect(() => {
		setPage(1)
		setCursors([])
	}, [status, eventName, endpointId])

	useEffect(() => {
		setSelectedDeliveryIds([])
	}, [page, status, eventName, endpointId])

	useEffect(() => {
		if (next_cursor && page === cursors.length + 1) {
			setCursors(prev => [...prev, next_cursor])
		}
	}, [next_cursor, page, cursors.length])

	const groupedDeliveries = useMemo(() => {
		if (!deliveries) return []
		const groups: Record<string, DeliveryRow[]> = {};
		(deliveries as DeliveryRow[]).forEach((delivery) => {
			const date = new Date(delivery.created_at ?? "").toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			})
			if (!groups[date]) groups[date] = []
			groups[date].push(delivery)
		})
		return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
	}, [deliveries])

	const visibleDeliveries = useMemo(
		() => (groupedDeliveries.flatMap(([, items]) => items) as DeliveryRow[]),
		[groupedDeliveries]
	)
	const replayRangeInvalid = Boolean(
		replayEndDateTime &&
		replayStartDateTime &&
		new Date(replayEndDateTime) < new Date(replayStartDateTime)
	)
	const eventOptions = useMemo(
		() => (events || []).map((event: WebhookAppEvent) => ({ value: event.event_name, label: event.event_name })),
		[events]
	)
	const endpointOptions = useMemo(
		() => (endpoints || []).map((endpoint: EndpointWithSubscriptions) => ({ value: endpoint.id, label: endpoint.url })),
		[endpoints]
	)
	const resetFilters = () => {
		setStatus("all")
		setEventName("all")
		setEndpointId("all")
	}
	const exportVisibleCsv = () => {
		const headers = ["delivery_id", "event_name", "status", "http_status_code", "response_time_ms", "created_at", "endpoint_id"]
		const rows = visibleDeliveries.map((delivery) => {
			const normalized = normalizeWebhookStatus(delivery.status, delivery.response_status ?? delivery.http_status_code)
			return [
				delivery.id,
				delivery.event_type || delivery.event_name || "",
				webhookStatusLabel(normalized).toLowerCase(),
				String(delivery.response_status ?? delivery.http_status_code ?? ""),
				String(delivery.response_time_ms ?? ""),
				delivery.created_at ?? "",
				delivery.endpoint_id ?? "",
			]
		})
		const csv = [headers, ...rows]
			.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
			.join("\n")
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
		const url = URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.setAttribute("download", "webhook-deliveries.csv")
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
			<div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
				<div className="min-w-0">
					<div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
						Webhooks
					</div>
					<h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
						Deliveries
					</h1>
					<p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
						Every dispatch attempt — status, latency and payload.
					</p>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					{hasSelection ? (
						<Button
							size="sm"
							className="h-[30px]"
							onClick={handleReplaySelected}
							disabled={replaySelectedLoading}
						>
							{replaySelectedLoading ? "Queuing..." : `Replay selected (${selectedDeliveryIds.length})`}
						</Button>
					) : (
						<WebhookLogControls
							controlClassName="h-[30px] w-[30px] p-0"
							filterStatus={status}
							onFilterStatusChange={setStatus}
							filterEventName={eventName}
							onFilterEventNameChange={setEventName}
							filterEndpointId={endpointId}
							onFilterEndpointIdChange={setEndpointId}
							eventOptions={eventOptions}
							endpointOptions={endpointOptions}
							onResetFilters={resetFilters}
							replayPopoverOpen={replayPopoverOpen}
							onReplayPopoverOpenChange={setReplayPopoverOpen}
							activeReplayCount={activeReplayCount}
							replayStatus={replayStatus}
							onReplayStatusChange={setReplayStatus}
							replayEventName={replayEventName}
							onReplayEventNameChange={setReplayEventName}
							replayEndpointId={replayEndpointId}
							onReplayEndpointIdChange={setReplayEndpointId}
							replayStartDateTime={replayStartDateTime}
							onReplayStartDateTimeChange={setReplayStartDateTime}
							replayEndDateTime={replayEndDateTime}
							onReplayEndDateTimeChange={setReplayEndDateTime}
							isReplayRangeInvalid={replayRangeInvalid}
							replayRangeLoading={replayRangeLoading}
							onQueueReplay={handleReplayByRange}
							replayJobs={replayJobs}
							onRefreshReplayJobs={() => void loadReplayJobs()}
							onCancelReplayJob={(taskId) => void handleCancelReplayTask(taskId)}
							onExportCsv={exportVisibleCsv}
						/>
					)}
				</div>
			</div>

			{loading && (!deliveries || deliveries.length === 0) ? (
				<div className="space-y-7">
					{[0, 1].map((g) => (
						<div key={g}>
							<div className="mb-2.5 flex items-center gap-3">
								<span className="h-3 w-24 animate-pulse rounded bg-muted" />
								<span className="h-px flex-1 bg-border" />
							</div>
							<div className="overflow-hidden rounded-[10px] border border-border bg-card">
								{[0, 1, 2].map((i) => (
									<div key={i} className="flex items-center gap-3 border-b border-border px-[18px] py-3 last:border-0">
										<span className="size-1.5 animate-pulse rounded-full bg-muted" />
										<span className="h-3 flex-1 animate-pulse rounded bg-muted" />
										<span className="h-[22px] w-16 animate-pulse rounded-[4px] bg-muted" />
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			) : !groupedDeliveries || groupedDeliveries.length === 0 ? (
				<div className="rounded-[10px] border border-dashed border-border bg-muted/30 py-16 text-center">
					<p className="text-sm text-muted-foreground">No delivery logs found matching your criteria.</p>
				</div>
			) : (
				<div className="space-y-7">
					{groupedDeliveries.map(([date, items]: [string, DeliveryRow[]]) => (
						<div key={date}>
							<div className="mb-2.5 flex items-center gap-3">
								<span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
									{date}
								</span>
								<span className="h-px flex-1 bg-border" />
								<span className="font-mono text-[11px] text-muted-foreground/70">
									{items.length} {items.length === 1 ? "delivery" : "deliveries"}
								</span>
							</div>

							<div className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-card">
								{items.map((delivery) => {
									const isExpanded = expandedRowId === delivery.id
									const deliveryStatus = normalizeWebhookStatus(
										delivery.status,
										delivery.response_status ?? delivery.http_status_code
									)
									const statusDotColor = webhookStatusDotClass(deliveryStatus)
									const selected = selectedDeliveryIds.includes(delivery.id)

									return (
										<div key={delivery.id} className={cn(isExpanded && "bg-accent/20")}>
											<div
												onClick={() => handleRowExpand(delivery.id)}
												className="flex cursor-pointer items-center gap-3 px-[18px] py-3 transition-colors hover:bg-accent/40"
											>
												<label
													className="relative inline-flex size-4 shrink-0 cursor-pointer items-center justify-center"
													onClick={(e) => e.stopPropagation()}
												>
													<input
														type="checkbox"
														checked={selected}
														onChange={() => toggleDeliverySelection(delivery.id)}
														className="peer sr-only"
													/>
													<span className="size-4 rounded-[4px] border border-input bg-card transition-colors peer-checked:border-primary peer-checked:bg-primary" />
													<Check className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
												</label>

												<span className={cn("size-1.5 shrink-0 rounded-full", statusDotColor)} />

												<span className="inline-flex h-[20px] max-w-[180px] shrink-0 items-center truncate rounded-[4px] bg-primary/10 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-primary">
													{delivery.event_type || delivery.event_name || "unknown"}
												</span>

												<span
													className={cn(
														"inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
														webhookStatusBadgeClass(deliveryStatus),
													)}
												>
													<span className={cn("size-1.5 rounded-full", statusDotColor)} />
													{webhookStatusLabel(deliveryStatus)}
												</span>

												<span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground md:inline">
													{new Date(delivery.created_at ?? "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
												</span>

												<div className="ml-auto flex shrink-0 items-center gap-3">
													<span className="font-mono text-[11px] tabular-nums text-foreground/80">
														{delivery.response_status || delivery.http_status_code || "—"}
													</span>
													<span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">
														{delivery.response_time_ms ? `${delivery.response_time_ms} ms` : "—"}
													</span>
													<Button
														variant="outline"
														size="sm"
														className="size-7 shrink-0 p-0"
														onClick={(e) => {
															e.stopPropagation()
															handleReplayDelivery(delivery.id)
														}}
														disabled={isDeliveryReplaying(delivery.id)}
														aria-label="Replay delivery"
													>
														{isDeliveryReplaying(delivery.id) ? (
															<Loader2 className="h-3.5 w-3.5 animate-spin" />
														) : (
															<RotateCcw className="h-3.5 w-3.5" />
														)}
													</Button>
													<span className="text-muted-foreground/50">
														{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
													</span>
												</div>
											</div>

											{isExpanded && (
												<div className="border-t border-border bg-secondary/20 px-[18px] py-4">
													{isLoadingDetails ? (
														<div className="flex items-center justify-center py-10">
															<Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
														</div>
													) : detailsList && detailsList.length > 0 ? (
														<div className="space-y-3">
															{delivery.filtered_reason && (
																<div className="rounded-[6px] border border-warning/30 bg-warning-soft p-3 text-[12px] text-warning">
																	Filtered reason: {delivery.filtered_reason}
																</div>
															)}
															{detailsList.map((details) => (
																<AttemptDetail
																	key={details.attempt_number}
																	details={details}
																	isExpanded={expandedAttempts[delivery.id]?.includes(details.attempt_number)}
																	onToggle={() => toggleAttemptExpand(delivery.id, details.attempt_number)}
																	getStatusColor={getStatusColor}
																	enableCurlCopy
																/>
															))}
														</div>
													) : (
														<div className="py-8 text-center text-[12px] italic text-muted-foreground/60">
															Could not load delivery details
														</div>
													)}
												</div>
											)}
										</div>
									)
								})}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			<div className="mt-8 flex items-center justify-between border-t border-border pt-6">
				<div className="font-mono text-[11px] text-muted-foreground">
					Page {page}
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(Math.max(1, page - 1))}
						disabled={page === 1 || loading}
						className="h-[30px]"
					>
						<ChevronLeft className="h-3.5 w-3.5" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(page + 1)}
						disabled={!has_more || loading}
						className="h-[30px]"
					>
						Next
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			<Dialog open={confirmReplayOpen} onOpenChange={setConfirmReplayOpen}>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle className="text-base">Confirm range replay</DialogTitle>
						<DialogDescription className="text-xs">
							Replay deliveries matching the selected replay filters and date/time range.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setConfirmReplayOpen(false)} disabled={replayRangeLoading}>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={confirmReplayByRange}
							disabled={
								replayRangeLoading ||
								!replayStartDateTime ||
								Boolean(replayEndDateTime && new Date(replayEndDateTime) < new Date(replayStartDateTime))
							}
						>
							{replayRangeLoading ? "Queuing..." : "Replay"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
