"use client"

import { useEffect, useMemo, useState, use } from "react"
import { useWebhookDeliveries, useWebhookAnalytics, useWebhookTimeseries, useWebhookEndpoints } from "@wacht/nextjs"
import type { EndpointWithSubscriptions } from "@wacht/types"
import { Button } from "@/components/ui/button"
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
		if (statusCode >= 200 && statusCode < 300) return "bg-success"
		if (statusCode >= 400 && statusCode < 500) return "bg-warning"
		if (statusCode >= 500) return "bg-error"
		return "bg-muted-foreground"
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
			<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
				<Link
					href="/webhook/endpoints"
					className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to endpoints
				</Link>
				<div className="mt-10 rounded-[10px] border border-dashed border-border bg-muted/30 py-16 text-center">
					<p className="text-sm text-muted-foreground">Endpoint not found</p>
				</div>
			</div>
		)
	}

	const subscribedCount = endpoint?.subscribed_events.length ?? 0

	return (
		<div className="mx-auto w-full max-w-7xl space-y-[18px] px-4 py-6 md:px-6 md:py-8">
			<Link
				href="/webhook/endpoints"
				className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="h-3.5 w-3.5" />
				Back to endpoints
			</Link>

			{/* Endpoint header card */}
			<section className="rounded-[10px] border border-border bg-card p-[22px]">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
					<div className="min-w-0 flex-1">
						<div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
							Endpoint · {endpointId}
						</div>
						<div className="mb-2 truncate font-mono text-[16px] font-medium text-foreground" title={endpoint?.url}>
							{endpoint?.url}
						</div>
						<div className="flex flex-wrap items-center gap-2.5">
							<span
								className={cn(
									"inline-flex h-[22px] items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
									endpoint?.is_active
										? "border-success/30 bg-success-soft text-success"
										: "border-border bg-secondary text-muted-foreground",
								)}
							>
								<span className={cn("size-1.5 rounded-full", endpoint?.is_active ? "bg-success" : "bg-muted-foreground/40")} />
								{endpoint?.is_active ? "active" : "inactive"}
							</span>
							<span className="font-mono text-[11px] text-muted-foreground">
								subscribed to {subscribedCount} {subscribedCount === 1 ? "event" : "events"}
							</span>
							{endpoint?.rate_limit_config && (
								<span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
									<Zap className="h-3.5 w-3.5 text-muted-foreground/70" />
									{endpoint.rate_limit_config.max_requests} / {endpoint.rate_limit_config.duration_ms === 1000 ? "sec" : endpoint.rate_limit_config.duration_ms === 60000 ? "min" : "hr"}
								</span>
							)}
						</div>
					</div>

					<div className="flex shrink-0 flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="h-[30px]"
							onClick={() => setTestDialogOpen(true)}
							disabled={!endpoint?.is_active}
						>
							<Send className="mr-1.5 h-3.5 w-3.5" />
							Test
						</Button>
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" size="sm" className="size-[30px] p-0" aria-label="Endpoint actions">
									<MoreHorizontal className="h-3.5 w-3.5" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="end" className="w-[150px] p-1">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-full justify-start text-xs"
									onClick={() => setEditDialogOpen(true)}
								>
									Edit configuration
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-full justify-start text-xs text-destructive hover:text-destructive"
									onClick={() => setDeleteDialogOpen(true)}
								>
									Delete endpoint
								</Button>
							</PopoverContent>
						</Popover>
						<DateRangePicker
							value={dateRange}
							onChange={(range) => range?.from && setDateRange({ from: range.from, to: range.to })}
						/>
					</div>
				</div>

				{endpoint?.description && (
					<p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{endpoint.description}</p>
				)}

				{subscribedCount > 0 && (
					<div className="mt-4 flex flex-wrap gap-1.5">
						{endpoint?.subscribed_events.map((event: string) => (
							<span
								key={event}
								className="inline-flex h-[20px] items-center rounded-[4px] bg-primary/10 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-primary"
							>
								{event}
							</span>
						))}
					</div>
				)}
			</section>

			<EndpointStatsGrid
				analyticsLoading={analyticsLoading}
				totalDeliveries={analytics?.total_deliveries}
				successRate={analytics?.success_rate}
				avgResponseTimeMs={analytics?.avg_response_time_ms}
				failed={analytics?.failed}
			/>

			{/* Chart + percentiles */}
			<div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.6fr_1fr]">
				<EndpointTrafficChart loading={timeseriesLoading} data={chartData} />

				<section className="overflow-hidden rounded-[10px] border border-border bg-card">
					<div className="border-b border-border px-[18px] py-3 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
						Response time percentiles
					</div>
					<div className="grid grid-cols-3 divide-x divide-border">
						<PctCell label="P50" value={analyticsLoading ? "—" : `${Math.round(analytics?.p50_response_time_ms || 0)}ms`} />
						<PctCell label="P95" value={analyticsLoading ? "—" : `${Math.round(analytics?.p95_response_time_ms || 0)}ms`} />
						<PctCell label="P99" value={analyticsLoading ? "—" : `${Math.round(analytics?.p99_response_time_ms || 0)}ms`} valueClass="text-warning" />
					</div>
				</section>
			</div>

			{/* Recent deliveries */}
			<div>
				<div className="mb-2.5 flex items-center justify-between gap-3">
					<div>
						<h3 className="text-[14px] font-medium leading-[1.2] text-foreground">Recent deliveries</h3>
						<p className="mt-0.5 text-[12px] text-muted-foreground">Click any row to inspect the payload, headers and response.</p>
					</div>
					<WebhookLogControls
						controlClassName="h-[30px] w-[30px] p-0"
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
						<p className="text-sm text-muted-foreground">No deliveries found for this endpoint.</p>
					</div>
				) : (
					<div className="space-y-7">
						{groupedDeliveries.map(([date, items]: [string, DeliveryRow[]]) => (
							<div key={date}>
								<div className="mb-2.5 flex items-center gap-3">
									<span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{date}</span>
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

										return (
											<div key={delivery.id} className={cn(isExpanded && "bg-accent/20")}>
												<div
													onClick={() => handleRowExpand(delivery.id)}
													className="flex cursor-pointer items-center gap-3 px-[18px] py-3 transition-colors hover:bg-accent/40"
												>
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
														{new Date(delivery.created_at || delivery.timestamp || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
																navigator.clipboard.writeText(delivery.id)
															}}
															aria-label="Copy delivery id"
														>
															<Copy className="h-3.5 w-3.5" />
														</Button>
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
														{isLoadingExpandedDetails ? (
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
																		enableCurlCopy={false}
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
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between border-t border-border pt-6">
				<p className="font-mono text-[11px] text-muted-foreground">Page {page}</p>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-[30px]"
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
					>
						<ChevronLeft className="h-3.5 w-3.5" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-[30px]"
						onClick={() => setPage(p => p + 1)}
						disabled={!has_more || loading}
					>
						Next
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>

			{/* Test Webhook Dialog */}
			<Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
				<DialogContent className="flex h-[80vh] flex-col overflow-hidden p-0 sm:max-w-[800px]">
					<DialogHeader className="p-6 pb-0">
						<DialogTitle className="text-lg font-medium">Test webhook</DialogTitle>
						<DialogDescription className="text-sm">
							Dispatch a diagnostic payload to verify your endpoint integration.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-1 flex-col gap-6 overflow-hidden p-6 pt-4">
						<div className="space-y-2">
							<Label className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Select event type</Label>
							<Select value={selectedTestEvent} onValueChange={setSelectedTestEvent}>
								<SelectTrigger className="h-[30px] w-full text-[12px]">
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
								<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-border">
									<div className="grid h-full grid-cols-1 divide-y divide-border overflow-hidden md:grid-cols-2 md:divide-x md:divide-y-0">
										<div className="flex min-h-0 flex-col">
											<div className="border-b border-border bg-secondary/40 px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
												Expected schema
											</div>
											<div className="custom-scrollbar flex-1 overflow-y-auto p-4">
												{schemaProps ? (
													<SchemaViewer schema={schemaProps as Record<string, unknown>} />
												) : (
													<p className="text-[12px] italic text-muted-foreground/70">No schema defined for this event.</p>
												)}
											</div>
										</div>

										<div className="flex min-h-0 flex-col bg-secondary/20">
											<div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2.5">
												<span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Payload example</span>
												{examplePayload && (
													<button
														onClick={() => navigator.clipboard.writeText(JSON.stringify(examplePayload, null, 2))}
														className="font-mono text-[10px] uppercase tracking-[0.06em] text-primary transition-colors hover:underline"
													>
														Copy
													</button>
												)}
											</div>
											<div className="custom-scrollbar flex-1 overflow-y-auto p-4">
												{examplePayload ? (
													<JsonViewer data={examplePayload} />
												) : (
													<p className="text-[12px] italic text-muted-foreground/70">No example payload provided.</p>
												)}
											</div>
										</div>
									</div>
								</div>
							)
						})() : (
							<div className="flex flex-1 flex-col items-center justify-center rounded-[8px] border border-dashed border-border p-8 text-center">
								<Send className="mb-3 h-8 w-8 text-muted-foreground/60" />
								<p className="text-[12px] text-muted-foreground">Select an event type above to view its schema and test payload.</p>
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2 border-t border-border bg-secondary/30 p-6">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setTestDialogOpen(false)}
							disabled={isTesting}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleTestWebhook}
							disabled={!selectedTestEvent || isTesting}
						>
							{isTesting ? (
								<>
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Send className="mr-2 h-3.5 w-3.5" />
									Send test
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
						<DialogTitle className="text-base">Delete endpoint</DialogTitle>
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
						<DialogTitle className="text-base">Confirm range replay</DialogTitle>
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

function PctCell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
	return (
		<div className="flex flex-col gap-1.5 px-[18px] py-[14px]">
			<div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
			<div className={cn("text-[20px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground", valueClass)}>{value}</div>
		</div>
	)
}
