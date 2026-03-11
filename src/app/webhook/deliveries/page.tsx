"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Check, ChevronLeft, ChevronRight, ChevronDown, Loader2, RotateCcw } from "lucide-react"
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
		if (statusCode >= 200 && statusCode < 300) return "bg-green-500"
		if (statusCode >= 400 && statusCode < 500) return "bg-orange-500"
		if (statusCode >= 500) return "bg-red-500"
		return "bg-slate-500"
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
		<div className="w-full px-4 py-2 md:px-6 md:py-3 mx-auto">
			<div className="flex items-center justify-between gap-4 mb-6">
				<div>
					<h1 className="text-lg font-normal text-foreground">Webhook Logs</h1>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					{hasSelection ? (
						<Button
							size="sm"
							className="h-9 px-3"
							onClick={handleReplaySelected}
							disabled={replaySelectedLoading}
						>
							{replaySelectedLoading ? "Queuing..." : `Replay Selected (${selectedDeliveryIds.length})`}
						</Button>
					) : (
						<WebhookLogControls
							controlClassName="h-9 w-9 p-0 border-border/40"
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

			{/* Timeline View */}
			{loading && (!deliveries || deliveries.length === 0) ? (
				<div className="space-y-4">
					{[1, 2].map(group => (
						<div key={group} className="relative">
							<div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-border/30 -z-10" />
							<div className="flex items-center gap-4 mb-4">
								<div className="w-4 h-4 rounded-full border-2 border-border/40 bg-card z-10" />
								<div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
								<div className="h-px flex-1 bg-border/30" />
							</div>
							<div className="space-y-2">
								{[1, 2, 3].map(i => (
									<div key={i} className="h-10 w-full animate-pulse rounded-lg border border-border/40 bg-card" />
								))}
							</div>
						</div>
					))}
				</div>
			) : !groupedDeliveries || groupedDeliveries.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border/50 bg-secondary/30 py-16 text-center">
					<p className="text-sm font-normal text-muted-foreground">No delivery logs found matching your criteria.</p>
				</div>
			) : (
				<div className="space-y-10">
					{groupedDeliveries.map(([date, items]: [string, DeliveryRow[]]) => (
						<div key={date} className="relative group/group">
							<div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10 group-last/group:h-0" />

							<div className="flex items-center gap-4 mb-4">
								<div className="w-4 h-4 rounded-full border-2 border-primary/40 bg-card z-10" />
								<h2 className="text-xs font-normal uppercase text-foreground/70">
									{date}
								</h2>
								<div className="h-px flex-1 bg-gradient-to-r from-border/30 to-transparent" />
							</div>

							<div className="space-y-2">
								{items.map((delivery) => {
									const isExpanded = expandedRowId === delivery.id
									const deliveryStatus = normalizeWebhookStatus(
										delivery.status,
										delivery.response_status ?? delivery.http_status_code
									)
									const statusDotColor = webhookStatusDotClass(deliveryStatus)

									return (
										<div
											key={delivery.id}
											className={cn(
												"group/item transition-all duration-300",
												isExpanded ? "scale-[1.002]" : ""
											)}
										>
											<div
												className={cn(
													"relative overflow-hidden rounded-lg border transition-all duration-300",
													isExpanded
														? "border-primary/20 bg-primary/[0.01]"
														: "border-border/40 bg-card hover:border-border/60 hover:bg-accent/60"
												)}
											>
												{/* Main Row */}
												<div
													onClick={() => handleRowExpand(delivery.id)}
													className="flex items-center justify-between gap-4 px-4 py-2 cursor-pointer"
												>
													{/* Status & Event */}
													<div className="flex items-center gap-4 flex-1 min-w-0">
														<label
															className="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center"
															onClick={(e) => e.stopPropagation()}
														>
															<input
																type="checkbox"
																checked={selectedDeliveryIds.includes(delivery.id)}
																onChange={() => toggleDeliverySelection(delivery.id)}
																className="peer sr-only"
															/>
															<span className="h-4 w-4 rounded-[4px] border border-border/60 bg-muted/20 transition-colors peer-checked:border-primary/60 peer-checked:bg-primary/20" />
															<Check className="pointer-events-none absolute h-3 w-3 text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
														</label>
														<div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse", statusDotColor)} />

														<div className="flex items-center gap-3 min-w-0">
															<span className="text-sm font-normal text-foreground truncate">
																{delivery.event_type || "Unknown Event"}
															</span>
															<span className={cn("text-[10px] uppercase px-2 py-0.5 rounded-full border tracking-wide", webhookStatusBadgeClass(deliveryStatus))}>
																{webhookStatusLabel(deliveryStatus)}
															</span>
																<span className="hidden md:inline text-muted-foreground/30 text-xs">|</span>
																<span className="hidden md:inline text-xs text-muted-foreground/50 font-normal">
																	{new Date(delivery.created_at ?? "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
																</span>
														</div>
													</div>

													{/* Metrics */}
													<div className="flex items-center justify-end gap-6 shrink-0">
														<div className="flex items-center gap-4">
															<span className="text-xs font-normal tabular-nums text-foreground/80">
																{delivery.response_status || delivery.http_status_code || "---"}
															</span>
															<span className="text-muted-foreground/30 text-xs">•</span>
															<span className="text-xs text-foreground/80 font-normal tabular-nums">
																{delivery.response_time_ms ? `${delivery.response_time_ms}ms` : "---"}
															</span>
														</div>

															<div className="flex items-center gap-2">
																<Button
																variant="ghost"
																size="sm"
																className="h-7 w-7 p-0"
																onClick={(e) => {
																	e.stopPropagation()
																	handleReplayDelivery(delivery.id)
																}}
																disabled={isDeliveryReplaying(delivery.id)}
															>
																{isDeliveryReplaying(delivery.id) ? (
																	<div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
																) : (
																	<RotateCcw className="w-3.5 h-3.5" />
																)}
															</Button>
															<div className={cn(
																"p-1 rounded-lg transition-colors",
																isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground/30 group-hover/item:text-muted-foreground"
															)}>
																{isExpanded ? (
																	<ChevronDown className="w-3.5 h-3.5" />
																) : (
																	<ChevronRight className="w-3.5 h-3.5" />
																)}
															</div>
														</div>
													</div>
												</div>

												{/* Expanded Details */}
												{isExpanded && (
													<div className="border-t border-border/10 px-4 py-4 animate-in slide-in-from-top-2 duration-300">
														{isLoadingDetails ? (
															<div className="flex items-center justify-center py-12">
																<Loader2 className="w-5 h-5 animate-spin text-muted-foreground/20" />
															</div>
														) : detailsList && detailsList.length > 0 ? (
															<div className="space-y-4">
																{delivery.filtered_reason && (
																	<div className="rounded-lg border border-yellow-500/20 bg-yellow-500/8 p-3 text-xs text-yellow-600 dark:text-yellow-400">
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
															<div className="text-center py-10">
																<p className="text-xs text-muted-foreground/30 font-normal italic">Could not load delivery details</p>
															</div>
														)}
													</div>
												)}
											</div>
										</div>
									)
								})}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			<div className="flex items-center justify-between mt-12 pt-6 border-t border-border/30">
				<div className="text-xs text-muted-foreground font-normal tracking-tight">
					Page {page}
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(Math.max(1, page - 1))}
						disabled={page === 1 || loading}
						className="h-8 rounded-lg border-border/40 px-3 text-xs font-normal transition-all hover:bg-accent"
					>
						<ChevronLeft className="w-3.5 h-3.5 mr-1 opacity-50" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(page + 1)}
						disabled={!has_more || loading}
						className="h-8 rounded-lg border-border/40 px-3 text-xs font-normal transition-all hover:bg-accent"
					>
						Next
						<ChevronRight className="w-3.5 h-3.5 ml-1 opacity-50" />
					</Button>
				</div>
			</div>

			<Dialog open={confirmReplayOpen} onOpenChange={setConfirmReplayOpen}>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle className="text-base">Confirm Range Replay</DialogTitle>
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
