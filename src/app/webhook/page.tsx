"use client"

import { useState } from "react"
import Link from "next/link"
import {
	addDays,
} from "date-fns"
import { useWebhookApp } from "@/components/webhook-provider"
import { useWebhookAnalytics, useWebhookTimeseries, useWebhookStats } from "@wacht/nextjs"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"
import { AlertTriangle, ArrowUpRight, Check, Copy, RotateCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function WebhookPage() {
	const { webhookApp, loading: appLoading, reload: reloadApp, rotateSecret } = useWebhookApp()

	const { stats, loading: statsLoading } = useWebhookStats() as {
		stats: { endpoint_count: number; event_count: number } | null
		loading: boolean
	}

	const [copiedSecret, setCopiedSecret] = useState(false)
	const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
	const [isRotating, setIsRotating] = useState(false)
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

	const { analytics, loading: analyticsLoading } = useWebhookAnalytics({
		start_date: startDate,
		end_date: endDate,
		fields: [
			"total_deliveries",
			"total_events",
			"success_rate",
			"avg_response_time_ms",
			"avg_payload_size",
			"successful",
			"failed",
			"filtered",
			"p50_response_time_ms",
			"p95_response_time_ms",
			"p99_response_time_ms",
		],
	})

	const { timeseries, loading: timeseriesLoading } = useWebhookTimeseries({
		start_date: startDate,
		end_date: endDate,
		interval: "day",
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
		{ deliveries: number; successful: number; failed: number; filtered: number }
	>()
	for (const point of timeseries || []) {
		const key = point.timestamp.slice(0, 10)
		const prev = pointsByDay.get(key) || { deliveries: 0, successful: 0, failed: 0, filtered: 0 }
		pointsByDay.set(key, {
			deliveries: prev.deliveries + (point.total_deliveries || 0),
			successful: prev.successful + (point.successful_deliveries || 0),
			failed: prev.failed + (point.failed_deliveries || 0),
			filtered: prev.filtered + (point.filtered_deliveries || 0),
		})
	}

	const chartData: Array<{
		time: string
		deliveries: number
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
			deliveries: point?.deliveries || 0,
			successful: point?.successful || 0,
			failed: point?.failed || 0,
			filtered: point?.filtered || 0,
		})
	}

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text)
			setCopiedSecret(true)
			setTimeout(() => setCopiedSecret(false), 2000)
		} catch (err) {
			console.error("Failed to copy:", err)
		}
	}

	const handleRotateSecret = async () => {
		setIsRotating(true)
		try {
			await rotateSecret()
			setRotateDialogOpen(false)
			if (reloadApp) await reloadApp()
		} catch (err) {
			console.error("Failed to rotate secret:", err)
		} finally {
			setIsRotating(false)
		}
	}

	const formatNumber = (value?: number) => {
		if (value === undefined || value === null) return "-"
		return value.toLocaleString()
	}

	if (appLoading) {
		return (
			<div className="w-full px-4 py-2 md:px-6 md:py-3 space-y-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-9 w-[240px]" />
				</div>
				<Skeleton className="h-[180px] w-full rounded-xl" />
				<Skeleton className="h-[320px] w-full rounded-xl" />
				<Skeleton className="h-[220px] w-full rounded-xl" />
			</div>
		)
	}

	return (
		<div className="w-full px-4 py-2 md:px-6 md:py-3">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
				<h1 className="text-lg font-normal text-foreground">Overview</h1>
				<DateRangePicker
					value={dateRange}
					onChange={(range) => {
						if (!range || !range.from || !range.to || range.from > range.to) {
							setDateRange({ from: addDays(new Date(), -7), to: new Date() })
						} else {
							setDateRange({ from: range.from, to: range.to })
						}
					}}
				/>
			</div>

			<div className="space-y-6">
				<section className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm">
					<div className="border-b border-border/40 bg-secondary/40 px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">
						Operations Snapshot
					</div>
					<div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border/20">
						<Metric label="Total Deliveries" value={analyticsLoading ? "-" : formatNumber(analytics?.total_deliveries)} />
						<Metric label="Total Events" value={analyticsLoading ? "-" : formatNumber(analytics?.total_events)} />
						<Metric
							label="Success Rate"
							value={analyticsLoading ? "-" : `${(analytics?.success_rate || 0).toFixed(1)}%`}
						/>
						<Metric label="Avg Response" value={analyticsLoading ? "-" : `${Math.round(analytics?.avg_response_time_ms || 0)}ms`} />
						<Metric label="Successful" value={analyticsLoading ? "-" : formatNumber(analytics?.successful)} />
						<Metric label="Failed" value={analyticsLoading ? "-" : formatNumber(analytics?.failed)} />
						<Metric label="Filtered" value={analyticsLoading ? "-" : formatNumber(analytics?.filtered)} />
						<Metric label="Avg Payload" value={analyticsLoading ? "-" : formatBytes(analytics?.avg_payload_size)} />
					</div>
				</section>

				<section className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm">
					<div className="border-b border-border/40 bg-secondary/40 px-4 py-3 flex items-center justify-between">
						<h2 className="text-sm font-normal text-foreground">Traffic Timeline</h2>
						<span className="text-xs text-muted-foreground">Daily</span>
					</div>
					<div className="px-4 pt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-green-600" />
							Successful
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-red-500" />
							Failed
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-yellow-500" />
							Filtered
						</span>
					</div>
					<div className="p-4 h-[320px]">
						{timeseriesLoading ? (
							<div className="h-full space-y-3">
								<Skeleton className="h-4 w-24" />
								<div className="grid grid-cols-7 gap-2 h-[260px] items-end">
									{Array.from({ length: 7 }).map((_, idx) => (
										<Skeleton key={idx} className="h-full w-full rounded-md" />
									))}
								</div>
							</div>
						) : chartData.length === 0 ? (
							<div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData} barCategoryGap="18%" margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
									<XAxis
										dataKey="time"
										axisLine={false}
										tickLine={false}
										dy={8}
										minTickGap={20}
										interval="preserveStartEnd"
										tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										dx={-8}
										allowDecimals={false}
										tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
									/>
									<Tooltip
										cursor={false}
										labelStyle={{ color: "var(--popover-foreground)", marginBottom: "4px" }}
										contentStyle={{
											backgroundColor: "var(--popover)",
											border: "1px solid var(--border)",
											borderRadius: "8px",
											fontSize: "12px",
											color: "var(--popover-foreground)",
											opacity: 1,
											boxShadow: "0 12px 32px rgba(0,0,0,0.10)",
										}}
										itemStyle={{ color: "var(--popover-foreground)" }}
											formatter={(value: ValueType | undefined, name: NameType | undefined) => {
												const key = String(name).toLowerCase()
												const label =
													key.includes("deliver") ? "Deliveries" :
														key.includes("success") ? "Successful" :
															key.includes("fail") ? "Failed" :
																"Filtered"
												return [Number(value ?? 0).toLocaleString(), label]
											}}
										/>
									<Bar
										dataKey="successful"
										fill="hsl(142, 76%, 36%)"
										fillOpacity={0.85}
										radius={[3, 3, 0, 0]}
										strokeWidth={0}
										name="Successful"
									/>
									<Bar
										dataKey="failed"
										fill="hsl(0, 84%, 60%)"
										fillOpacity={0.85}
										radius={[3, 3, 0, 0]}
										strokeWidth={0}
										name="Failed"
									/>
									<Bar
										dataKey="filtered"
										fill="hsl(38, 92%, 50%)"
										fillOpacity={0.9}
										radius={[3, 3, 0, 0]}
										strokeWidth={0}
										name="Filtered"
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</section>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<section className="border border-border/30 rounded-xl overflow-hidden">
						<div className="px-4 py-3 border-b border-border/20 text-xs uppercase tracking-wide text-muted-foreground">Latency Percentiles</div>
						<div className="grid grid-cols-3 divide-x divide-border/20">
							<Metric label="P50" value={analyticsLoading ? "-" : `${Math.round(analytics?.p50_response_time_ms || 0)}ms`} compact />
							<Metric label="P95" value={analyticsLoading ? "-" : `${Math.round(analytics?.p95_response_time_ms || 0)}ms`} compact />
							<Metric label="P99" value={analyticsLoading ? "-" : `${Math.round(analytics?.p99_response_time_ms || 0)}ms`} compact />
						</div>
					</section>

					<section className="border border-border/30 rounded-xl overflow-hidden">
						<div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
							<h2 className="text-sm font-normal text-foreground">Workspace Totals</h2>
						</div>
						<div className="grid grid-cols-2 divide-x divide-border/20">
							<Metric label="Active Endpoints" value={statsLoading ? "-" : formatNumber(stats?.endpoint_count)} href="/webhook/endpoints" compact />
							<Metric label="Webhook Events" value={statsLoading ? "-" : formatNumber(stats?.event_count)} href="/webhook/events" compact />
						</div>
					</section>
				</div>

				<section className="border border-border/30 rounded-xl overflow-hidden">
					<div className="px-4 py-3 border-b border-border/20 text-sm font-normal text-foreground">Signing Secret</div>
					<div className="p-4 space-y-3">
						<div className="flex items-center gap-2 flex-nowrap">
							<code className="flex-1 min-w-0 text-xs text-foreground/80 bg-muted/30 px-3 py-2 rounded border border-border/50 truncate">
								{webhookApp?.signing_secret}
							</code>
							<Button
								variant="outline"
								size="sm"
								className="h-8 w-8 p-0 shrink-0"
								onClick={() => webhookApp && copyToClipboard(webhookApp.signing_secret)}
							>
								{copiedSecret ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-8 w-8 p-0 shrink-0"
								onClick={() => setRotateDialogOpen(true)}
								aria-label="Rotate signing secret"
								title="Rotate signing secret"
							>
								<RotateCw className="w-3.5 h-3.5" />
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Rotation invalidates the previous secret immediately.
						</p>
					</div>
				</section>
			</div>

			<Dialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-yellow-500" />
							Rotate Signing Secret
						</DialogTitle>
						<DialogDescription className="text-xs pt-2">
							This action cannot be undone. Existing integrations using the old secret will fail verification.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setRotateDialogOpen(false)} disabled={isRotating}>
							Cancel
						</Button>
						<Button variant="destructive" size="sm" onClick={handleRotateSecret} disabled={isRotating}>
							{isRotating ? (
								<>
									<RotateCw className="w-4 h-4 mr-2 animate-spin" />
									Rotating...
								</>
							) : (
								"Rotate Secret"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

function Metric({
	label,
	value,
	compact = false,
	valueClass,
	href,
}: {
	label: string
	value: string
	compact?: boolean
	valueClass?: string
	href?: string
}) {
	const content = (
		<div className={cn(
			"px-4 transition-colors group/metric",
			compact ? "py-4" : "py-3",
			href && "hover:bg-muted/5 cursor-pointer"
		)}>
			<div className="flex items-center justify-between">
				<div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
				{href && <ArrowUpRight className="w-3 h-3 text-muted-foreground/0 group-hover/metric:text-muted-foreground/40 transition-all" />}
			</div>
			<div className={cn(compact ? "text-lg mt-1" : "text-base mt-1", "text-foreground", valueClass)}>{value}</div>
		</div>
	)

	if (href) {
		return <Link href={href}>{content}</Link>
	}

	return content
}

function formatBytes(bytes?: number) {
	if (bytes === undefined || bytes === null) return "-"
	if (bytes === 0) return "0 B"
	const k = 1024
	const sizes = ["B", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
