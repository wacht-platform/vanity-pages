"use client"

import { useEffect, useMemo, useState, use } from "react"
import { useWebhookDeliveries, useWebhookAnalytics, useWebhookTimeseries, useWebhookEndpoints } from "@wacht/nextjs"
import type { EndpointWithSubscriptions } from "@wacht/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Copy, Loader2, MoreHorizontal, RotateCcw, Send, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWebhookApp } from "@/components/webhook-provider"
import type {
	ReplayWebhookDeliveryOptions,
	TestEndpointOptions,
	WebhookAppEvent,
	WebhookDeliveryDetail,
} from "@wacht/types"
import { useWebhookEvents } from "@wacht/nextjs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { SchemaViewer } from "@/components/schema-viewer"
import { JsonViewer } from "@/components/json-viewer"
import { normalizeWebhookStatus, webhookStatusBadgeClass, webhookStatusDotClass, webhookStatusLabel } from "@/lib/webhook-status"
import { getReplayErrorDescription } from "@/lib/webhook-replay-error"
import { toast } from "sonner"
import { EditEndpointDialog } from "@/components/webhook/edit-endpoint-dialog"
import { WebhookLogControls } from "@/components/webhook/log-controls"
import { AttemptDetail } from "@/components/webhook/attempt-detail"
import { useReplayJobs } from "@/hooks/use-replay-jobs"
import { EndpointStatsGrid } from "@/components/webhook/endpoint-stats-grid"
import { EndpointTrafficChart } from "@/components/webhook/endpoint-traffic-chart"

type DeliveryRow = {
	id: string
	created_at?: string
	timestamp?: string
	status?: string
	response_status?: number
	http_status_code?: number
	event_type?: string
	event_name?: string
	response_time_ms?: number
	endpoint_id?: string
	filtered_reason?: string
}

function toUtcIsoFromLocalDateTime(dateTimeStr: string): string {
	return new Date(dateTimeStr).toISOString()
}

export default function EndpointDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: endpointId } = use(params)
	const router = useRouter()

	const { endpoints, refetch: refetchEndpoints } = useWebhookEndpoints()
	const endpoint = endpoints?.find((e: EndpointWithSubscriptions) => e.id === endpointId)
	const { replayDelivery, testEndpoint, fetchDeliveryDetail, deleteEndpoint, fetchReplayTaskStatus, fetchReplayTasks, cancelReplayTask } = useWebhookApp()
	const { events } = useWebhookEvents()
	const [replayingDeliveryIds, setReplayingDeliveryIds] = useState<string[]>([])
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)

	// Test webhook state
	const [testDialogOpen, setTestDialogOpen] = useState(false)
	const [selectedTestEvent, setSelectedTestEvent] = useState<string>("")
	const [isTesting, setIsTesting] = useState(false)

	// Dashboard State
	const [page, setPage] = useState(1)
	const [limit] = useState(10)
	const [status, setStatus] = useState<string>("all")
	const [eventName, setEventName] = useState<string>("all")
	const [replayStartDateTime, setReplayStartDateTime] = useState<string>("")
	const [replayEndDateTime, setReplayEndDateTime] = useState<string>("")
	const [replayStatus, setReplayStatus] = useState<string>("all")
	const [replayEventName, setReplayEventName] = useState<string>("all")
	const [replayRangeLoading, setReplayRangeLoading] = useState(false)
	const [replayPopoverOpen, setReplayPopoverOpen] = useState(false)
	const [confirmReplayOpen, setConfirmReplayOpen] = useState(false)
	const [cursors, setCursors] = useState<string[]>([])
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
	const [deliveryDetails, setDeliveryDetails] = useState<Record<string, WebhookDeliveryDetail[]>>({})
	const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})
	const [expandedAttempts, setExpandedAttempts] = useState<Record<string, number[]>>({})
	const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
		from: addDays(new Date(), -7),
		to: new Date(),
	})

	const startDateObj = new Date(dateRange?.from || addDays(new Date(), -7))
	startDateObj.setHours(0, 0, 0, 0)
	const startDate = startDateObj.toISOString()

	const endDateObj = new Date(dateRange?.to || new Date())
	endDateObj.setHours(23, 59, 59, 999)
	const endDate = endDateObj.toISOString()

	// Fetch deliveries for this endpoint
	const cursor = page > 1 ? cursors[page - 2] : undefined

	const { deliveries, has_more, next_cursor, loading, refetch } = useWebhookDeliveries({
		endpoint_id: endpointId,
		limit,
		cursor,
		status: status === "all" ? undefined : status,
		event_name: eventName === "all" ? undefined : eventName,
	})
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
			await refetch()
		},
	})

	useEffect(() => {
		setPage(1)
		setCursors([])
	}, [endpointId, status, eventName])

	useEffect(() => {
		if (next_cursor && page === cursors.length + 1) {
			setCursors(prev => [...prev, next_cursor])
		}
	}, [next_cursor, page, cursors.length])

	// Fetch analytics for this endpoint
	const { analytics, loading: analyticsLoading } = useWebhookAnalytics({
		start_date: startDate,
		end_date: endDate,
		endpoint_id: endpointId,
		fields: [
			"total_deliveries",
			"successful",
			"failed",
			"filtered",
			"success_rate",
			"avg_response_time_ms",
			"p50_response_time_ms",
			"p95_response_time_ms",
			"p99_response_time_ms"
		]
	})

	// Fetch timeseries for this endpoint
	const { timeseries, loading: timeseriesLoading } = useWebhookTimeseries({
		start_date: startDate,
		end_date: endDate,
		interval: "day",
		endpoint_id: endpointId,
	})

	const utcDayKey = (date: Date) => date.toISOString().slice(0, 10)
	const utcLabel = (date: Date) =>
		new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
	const parseUtcDayKey = (key: string) => {
		const [year, month, day] = key.split("-").map(Number)
		return new Date(Date.UTC(year, month - 1, day))
	}

	const pointsByDay = new Map<
		string,
		{ successful: number; failed: number; filtered: number }
	>()
	for (const point of timeseries || []) {
		const key = point.timestamp.slice(0, 10)
		const prev = pointsByDay.get(key) || { successful: 0, failed: 0, filtered: 0 }
		pointsByDay.set(key, {
			successful: prev.successful + (point.successful_deliveries || 0),
			failed: prev.failed + (point.failed_deliveries || 0),
			filtered: prev.filtered + (point.filtered_deliveries || 0),
		})
	}

	const chartData: Array<{
		time: string
		successful: number
		failed: number
		filtered: number
	}> = []

	const rangeStartKey = startDate.slice(0, 10)
	const rangeEndKey = endDate.slice(0, 10)
	for (
		let cursor = parseUtcDayKey(rangeStartKey);
		utcDayKey(cursor) <= rangeEndKey;
		cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
	) {
		const key = utcDayKey(cursor)
		const point = pointsByDay.get(key)
		chartData.push({
			time: utcLabel(cursor),
			successful: point?.successful || 0,
			failed: point?.failed || 0,
			filtered: point?.filtered || 0,
		})
	}

	const getStatusColor = (statusCode: number) => {
		if (statusCode >= 200 && statusCode < 300) return "bg-green-500"
		if (statusCode >= 400 && statusCode < 500) return "bg-orange-500"
		if (statusCode >= 500) return "bg-red-500"
		return "bg-slate-500"
	}


	useEffect(() => {
		if (replayPopoverOpen) {
			void loadReplayJobs()
		}
	}, [replayPopoverOpen, loadReplayJobs])

	const handleReplayDelivery = async (deliveryId: string) => {
		setReplayingDeliveryIds((prev) => [...prev, deliveryId])

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
			void refetch()
		} catch (error) {
			console.error("Failed to replay delivery:", error)
			toast.error("Replay failed", {
				description: getReplayErrorDescription(error, "Could not replay this delivery."),
			})
		} finally {
			setReplayingDeliveryIds((prev) => prev.filter((id) => id !== deliveryId))
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
				endpoint_id: endpointId,
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
			void refetch()
		} catch (error) {
			console.error("Failed to replay deliveries by range:", error)
			toast.error("Range replay failed", {
				description: getReplayErrorDescription(error, "Could not replay selected range."),
			})
		} finally {
			setReplayRangeLoading(false)
		}
	}

	const isDeliveryReplaying = (deliveryId: string) => {
		return replayingDeliveryIds.includes(deliveryId)
	}

	const handleRowExpand = async (deliveryId: string) => {
		if (expandedRowId === deliveryId) {
			setExpandedRowId(null)
			return
		}

		setExpandedRowId(deliveryId)
		if (!deliveryDetails[deliveryId]) {
			setLoadingDetails(prev => ({ ...prev, [deliveryId]: true }))
			try {
				const details = await fetchDeliveryDetail(deliveryId)
				const sortedDetails = (Array.isArray(details) ? details : [details]).sort((a, b) => b.attempt_number - a.attempt_number)
				setDeliveryDetails(prev => ({ ...prev, [deliveryId]: sortedDetails }))
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
			}
			return { ...prev, [deliveryId]: [...current, attemptNumber] }
		})
	}

	const detailsList = expandedRowId ? deliveryDetails[expandedRowId] : null
	const isLoadingExpandedDetails = expandedRowId ? loadingDetails[expandedRowId] : false

	const groupedDeliveries = useMemo(() => {
		if (!deliveries) return []
		const groups: Record<string, DeliveryRow[]> = {};
		(deliveries as DeliveryRow[]).forEach((delivery) => {
			const date = new Date(delivery.created_at || delivery.timestamp || "").toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric"
			})
			if (!groups[date]) groups[date] = []
			groups[date].push(delivery)
		})
		return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
	}, [deliveries])

	const visibleDeliveries = useMemo(
		() => groupedDeliveries.flatMap(([, items]) => items) as DeliveryRow[],
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
	const resetFilters = () => {
		setStatus("all")
		setEventName("all")
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
				delivery.created_at || delivery.timestamp || "",
				delivery.endpoint_id ?? endpointId,
			]
		})
		const csv = [headers, ...rows]
			.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
			.join("\n")
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
		const url = URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.setAttribute("download", `endpoint-${endpointId}-deliveries.csv`)
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	const handleTestWebhook = async () => {
		if (!selectedTestEvent) return

		setIsTesting(true)
		try {
			const eventData = events?.find((e: WebhookAppEvent) => e.event_name === selectedTestEvent)
			const options: TestEndpointOptions = {
				event_name: selectedTestEvent,
				payload: eventData?.example_payload
			}
			await testEndpoint(endpointId, options)
			setTestDialogOpen(false)
			setSelectedTestEvent("")
		} catch (error) {
			console.error("Failed to test webhook:", error)
		} finally {
			setIsTesting(false)
		}
	}

	const handleDeleteEndpoint = async () => {
		if (!endpoint) return
		setIsDeleting(true)
		try {
			await deleteEndpoint(endpoint.id)
			toast.success("Endpoint deleted", { description: "The endpoint was removed successfully." })
			setDeleteDialogOpen(false)
			router.push("/webhook/endpoints")
		} catch (error) {
			console.error("Failed to delete endpoint:", error)
			toast.error("Delete failed", { description: "Could not delete this endpoint." })
		} finally {
			setIsDeleting(false)
		}
	}

	if (!endpoint && !loading) {
		return (
			<div className="flex flex-col h-full min-h-screen">
				<div className="h-14 border-b border-border/50 px-6 flex items-center sticky top-0 bg-background/95 backdrop-blur z-10">
					<Link href="/webhook/endpoints">
						<Button variant="ghost" size="sm" className="h-8 gap-2" asChild>
							<span className="flex items-center gap-2">
								<ArrowLeft className="w-4 h-4" />
								Back to Endpoints
							</span>
						</Button>
					</Link>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<p className="text-muted-foreground">Endpoint not found</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full min-h-screen">
			{/* Top Bar */}
			<div className="h-14 border-b border-border/50 px-4 md:px-6 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span className="text-foreground font-medium text-xs md:text-sm max-w-[150px] sm:max-w-[300px] truncate">{endpoint?.url}</span>
				</div>
				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border/40" aria-label="Endpoint actions">
								<MoreHorizontal className="w-3.5 h-3.5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-[140px] p-1.5 bg-popover border-border">
							<div className="space-y-1">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-full justify-start text-xs"
									onClick={() => setEditDialogOpen(true)}
								>
									Edit
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-full justify-start text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete
								</Button>
							</div>
						</PopoverContent>
					</Popover>
					<div className="h-4 w-px bg-border/50 hidden md:block" />
					<DateRangePicker
						value={dateRange}
						onChange={(range) => range?.from && setDateRange({ from: range.from, to: range.to })}
					/>
				</div>
			</div>

			<div className="px-4 py-2 md:px-6 md:py-3 space-y-4 md:space-y-6">
				<div className="rounded-lg border border-border/50 bg-card p-4 shadow-sm">
					<div className="flex flex-col gap-4">
						<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
							<h2 className="text-base md:text-lg font-medium text-foreground break-all">{endpoint?.url}</h2>
							<div className="flex items-center gap-3">
								<div className={cn(
									"flex items-center shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-normal",
									endpoint?.is_active
										? "bg-green-500/5 text-green-600 border-green-500/20"
										: "bg-secondary/60 text-muted-foreground border-border/50"
								)}>
									{endpoint?.is_active ? "Active" : "Inactive"}
								</div>

								<div className="flex items-center gap-3 text-xs text-muted-foreground font-normal">
									<span className="text-border/40">|</span>
									<span>{endpoint?.subscribed_events.length} event{endpoint?.subscribed_events.length !== 1 ? 's' : ''}</span>

									{endpoint?.rate_limit_config && (
										<>
											<span className="text-border/40">|</span>
											<div className="flex items-center gap-1.5">
												<Zap className="w-3.5 h-3.5 text-muted-foreground/70" />
												<span>{endpoint.rate_limit_config.max_requests} / {endpoint.rate_limit_config.duration_ms === 1000 ? 'sec' : endpoint.rate_limit_config.duration_ms === 60000 ? 'min' : 'hr'}</span>
											</div>
										</>
									)}
								</div>
							</div>
							<div className="ml-auto">
								<Button
									variant="outline"
									size="sm"
									className="h-8 text-xs"
									onClick={() => setTestDialogOpen(true)}
									disabled={!endpoint?.is_active}
								>
									<Send className="w-3 h-3 mr-1.5" />
									<span className="hidden sm:inline">Test</span>
								</Button>
							</div>
						</div>

						{endpoint?.description && (
							<p className="text-sm text-muted-foreground font-normal max-w-3xl leading-relaxed">{endpoint.description}</p>
						)}

						<div className="flex flex-wrap gap-1.5 pt-1">
							{endpoint?.subscribed_events.map((event: string) => (
								<Badge key={event} variant="secondary" className="h-auto border-border/20 bg-secondary/60 px-2 py-0.5 text-xs font-normal text-muted-foreground">
									{event}
								</Badge>
							))}
						</div>
					</div>
				</div>

				<EndpointStatsGrid
					analyticsLoading={analyticsLoading}
					totalDeliveries={analytics?.total_deliveries}
					successRate={analytics?.success_rate}
					avgResponseTimeMs={analytics?.avg_response_time_ms}
					failed={analytics?.failed}
				/>

				<EndpointTrafficChart loading={timeseriesLoading} data={chartData} />

				{/* Response Time Percentiles */}
				<div className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm">
					<div className="border-b border-border/40 bg-secondary/40 px-4 py-3">
						<h3 className="text-sm font-normal text-foreground">Response Time Percentiles</h3>
					</div>
					<div className="p-4 md:p-6">
						<div className="grid grid-cols-3 gap-3 md:gap-6">
							<div>
								<div className="text-xs md:text-xs font-normal text-muted-foreground uppercase mb-1 md:mb-2 tracking-wider">P50 (Median)</div>
								<div className="text-lg md:text-2xl text-foreground">
									{analyticsLoading ? "—" : `${Math.round(analytics?.p50_response_time_ms || 0)}ms`}
								</div>
							</div>
							<div>
								<div className="text-xs md:text-xs font-medium text-muted-foreground uppercase mb-1 md:mb-2">P95</div>
								<div className="text-lg md:text-2xl text-foreground">
									{analyticsLoading ? "—" : `${Math.round(analytics?.p95_response_time_ms || 0)}ms`}
								</div>
							</div>
							<div>
								<div className="text-xs md:text-xs font-medium text-muted-foreground uppercase mb-1 md:mb-2">P99</div>
								<div className="text-lg md:text-2xl text-foreground">
									{analyticsLoading ? "—" : `${Math.round(analytics?.p99_response_time_ms || 0)}ms`}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Deliveries Timeline */}
				<div>
					<div className="px-1 py-1 flex items-center justify-between">
						<h3 className="text-sm font-normal text-foreground">Recent Deliveries</h3>
						<div className="flex items-center gap-2">
							<WebhookLogControls
								controlClassName="h-8 w-8 p-0 border-border/40"
								filterStatus={status}
								onFilterStatusChange={setStatus}
								filterEventName={eventName}
								onFilterEventNameChange={setEventName}
								eventOptions={eventOptions}
								onResetFilters={resetFilters}
								replayPopoverOpen={replayPopoverOpen}
								onReplayPopoverOpenChange={setReplayPopoverOpen}
								activeReplayCount={activeReplayCount}
								replayStatus={replayStatus}
								onReplayStatusChange={setReplayStatus}
								replayEventName={replayEventName}
								onReplayEventNameChange={setReplayEventName}
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
						</div>
					</div>
					<div className="pt-2">
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
								<p className="text-sm font-normal text-muted-foreground">No deliveries found for this endpoint.</p>
							</div>
						) : (
							<div className="space-y-8">
								{groupedDeliveries.map(([date, items]: [string, DeliveryRow[]]) => (
									<div key={date} className="relative group/group">
										<div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10 group-last/group:h-0" />
										<div className="flex items-center gap-4 mb-4">
											<div className="w-4 h-4 rounded-full border-2 border-primary/40 bg-card z-10" />
											<h2 className="text-xs font-normal uppercase text-foreground/70">{date}</h2>
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
													<div key={delivery.id} className={cn("group/item transition-all duration-300", isExpanded ? "scale-[1.002]" : "")}>
														<div className={cn(
															"relative overflow-hidden rounded-lg border transition-all duration-300",
															isExpanded
																? "border-primary/20 bg-primary/[0.01]"
																: "border-border/40 bg-card hover:border-border/60 hover:bg-accent/60"
														)}>
															<div
																onClick={() => handleRowExpand(delivery.id)}
																className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-2 cursor-pointer"
															>
																<div className="flex items-center gap-4 flex-1 min-w-0">
																	<div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse", statusDotColor)} />
																	<div className="flex items-center gap-3 min-w-0">
																		<span className="text-sm font-normal text-foreground truncate">
																			{delivery.event_type || delivery.event_name}
																		</span>
																		<span className={cn("text-[10px] uppercase px-2 py-0.5 rounded-full border tracking-wide", webhookStatusBadgeClass(deliveryStatus))}>
																			{webhookStatusLabel(deliveryStatus)}
																		</span>
																		<span className="hidden md:inline text-muted-foreground/30 text-xs">|</span>
																		<span className="hidden md:inline text-xs text-muted-foreground/50 font-normal">
																				{new Date(delivery.created_at || delivery.timestamp || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
																		</span>
																	</div>
																</div>
																<div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/20">
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
																				navigator.clipboard.writeText(delivery.id)
																			}}
																		>
																			<Copy className="w-3.5 h-3.5" />
																		</Button>
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
																			{isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
																		</div>
																	</div>
																</div>
															</div>
															{isExpanded && (
																<div className="border-t border-border/10 px-4 py-4 animate-in slide-in-from-top-2 duration-300">
																	{isLoadingExpandedDetails ? (
																		<div className="flex items-center justify-center py-12">
																			<Loader2 className="w-5 h-5 animate-spin text-muted-foreground/20" />
																		</div>
																	) : detailsList && detailsList.length > 0 ? (
																		<div className="space-y-4">
																			{delivery.filtered_reason && (
																				<div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-500">
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
																				enableCurlCopy={false}
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
					</div>
				</div>

				{/* Pagination */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-3">
					<p className="text-xs md:text-xs text-muted-foreground text-center sm:text-left">Page {page}</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-xs md:text-xs"
							onClick={() => setPage(p => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							<ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
							<span className="hidden sm:inline">Previous</span>
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-8 text-xs md:text-xs"
							onClick={() => setPage(p => p + 1)}
							disabled={!has_more || loading}
						>
							<span className="hidden sm:inline">Next</span>
							<ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Test Webhook Dialog */}
			<Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
				<DialogContent className="sm:max-w-[800px] p-0 overflow-hidden flex flex-col h-[80vh]">
					<DialogHeader className="p-6 pb-0">
						<DialogTitle className="text-xl font-normal">Test Webhook</DialogTitle>
						<DialogDescription className="text-sm">
							Dispatch a diagnostic payload to verify your endpoint integration.
						</DialogDescription>
					</DialogHeader>

					<div className="flex-1 overflow-hidden p-6 pt-4 flex flex-col gap-6">
						<div className="space-y-2">
							<Label className="text-xs uppercase font-normal text-muted-foreground">Select Event Type</Label>
							<Select value={selectedTestEvent} onValueChange={setSelectedTestEvent}>
								<SelectTrigger className="h-10 w-full border-border/50 bg-card text-sm">
									<SelectValue placeholder="Choose an event to test..." />
								</SelectTrigger>
								<SelectContent>
									{endpoint?.subscribed_events.map((event: string) => (
										<SelectItem key={event} value={event} className="text-xs">
											{event}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{selectedTestEvent ? (() => {
							const eventData = events?.find((e: WebhookAppEvent) => e.event_name === selectedTestEvent)
							const schemaProps = eventData?.schema?.properties
							const examplePayload = eventData?.example_payload

							return (
								<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/40 bg-card">
									<div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30 h-full overflow-hidden">
										{/* Schema Column */}
										<div className="flex flex-col min-h-0 h-full">
											<div className="border-b border-border/30 bg-secondary/40 px-4 py-2">
												<span className="text-xs font-normal text-muted-foreground/60">Expected Schema</span>
											</div>
											<div className="flex-1 overflow-y-auto custom-scrollbar p-4">
												{schemaProps ? (
													<SchemaViewer schema={schemaProps as Record<string, unknown>} />
												) : (
													<p className="text-xs text-muted-foreground/40 italic">No schema defined for this event.</p>
												)}
											</div>
										</div>

										{/* Example JSON Column */}
										<div className="flex h-full min-h-0 flex-col bg-secondary/20">
											<div className="flex items-center justify-between border-b border-border/30 bg-secondary/40 px-4 py-2">
												<div>
													<span className="text-xs font-normal text-muted-foreground/60">Expected Schema</span>
												</div>
												{examplePayload && (
													<button
														onClick={() => navigator.clipboard.writeText(JSON.stringify(examplePayload, null, 2))}
														className="text-xs text-primary hover:underline font-normal"
													>
														Copy
													</button>
												)}
											</div>
											<div className="flex-1 overflow-y-auto custom-scrollbar p-4">
												{examplePayload ? (
													<JsonViewer data={examplePayload} />
												) : (
													<p className="text-xs text-muted-foreground/40 italic">No example payload provided.</p>
												)}
											</div>
										</div>
									</div>
								</div>
							)
						})() : (
							<div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/50 p-8 text-center">
								<Send className="w-8 h-8 text-muted-foreground/20 mb-3" />
								<p className="text-xs text-muted-foreground">Select an event type above to view its schema and test payload.</p>
							</div>
						)}
					</div>

					<div className="flex justify-end gap-3 border-t border-border/20 bg-secondary/30 p-6">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setTestDialogOpen(false)}
							disabled={isTesting}
							className="h-9 px-5 text-xs font-normal"
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleTestWebhook}
							disabled={!selectedTestEvent || isTesting}
							className="h-9 px-6 text-xs font-normal"
						>
							{isTesting ? (
								<>
									<div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
									Sending...
								</>
							) : (
								<>
									<Send className="w-3 h-3 mr-2" />
									Send Test
								</>
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<EditEndpointDialog
				endpoint={endpoint || null}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				refetch={refetchEndpoints}
			/>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle className="text-base">Delete Endpoint</DialogTitle>
						<DialogDescription className="text-xs">
							Are you sure you want to delete this endpoint? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
						<Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleDeleteEndpoint}
							disabled={isDeleting}
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={confirmReplayOpen} onOpenChange={setConfirmReplayOpen}>
				<DialogContent className="sm:max-w-[440px]">
					<DialogHeader>
						<DialogTitle className="text-base">Confirm Range Replay</DialogTitle>
						<DialogDescription className="text-xs">
							Replay deliveries matching the selected replay filters and date/time range.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2">
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
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
