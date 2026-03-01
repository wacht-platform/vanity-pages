"use client"

import { useApiAuth } from "@/components/api-auth-provider"
import { useApiAuthAuditAnalytics, useApiAuthAuditTimeseries } from "@wacht/nextjs"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Tooltip as InfoTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, ChevronDown, ChevronRight, Activity } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ApiAuthLandingPage() {
	const { apiAuthApp, loading, hasSession } = useApiAuth()
	const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
		from: addDays(new Date(), -7),
		to: new Date(),
	})
	const [expandedRateLimits, setExpandedRateLimits] = useState<Set<number>>(new Set())

	const toggleRateLimitExpand = (index: number) => {
		const newExpanded = new Set(expandedRateLimits)
		if (newExpanded.has(index)) {
			newExpanded.delete(index)
		} else {
			newExpanded.add(index)
		}
		setExpandedRateLimits(newExpanded)
	}

	// Interval set to 'day' to match Webhook's 'Daily' graph
	const interval = "day"

	const startDateObj = new Date(dateRange?.from || addDays(new Date(), -7))
	startDateObj.setHours(0, 0, 0, 0)
	const startDate = startDateObj.toISOString()

	const endDateObj = new Date(dateRange?.to || new Date())
	endDateObj.setHours(23, 59, 59, 999)
	const endDate = endDateObj.toISOString()

	const { analytics, loading: analyticsLoading } = useApiAuthAuditAnalytics({
		start_date: startDate,
		end_date: endDate,
	})

	const { timeseries, loading: timeseriesLoading } = useApiAuthAuditTimeseries({
		start_date: startDate,
		end_date: endDate,
		interval: interval as "minute" | "hour" | "day" | "week" | "month",
	})

	const formatNumber = (value?: number) => {
		if (value === undefined || value === null) return "-"
		return value.toLocaleString()
	}

	const getRateLimitDescription = (limit: { max_requests: number; duration: number; unit: string; mode?: string | null }) => {
		const count = limit.max_requests.toLocaleString()
		const unit = limit.unit
		const duration = limit.duration
		const mode = limit.mode

		let periodPhrase = ""
		if (duration === 1) {
			// Singular units
			switch (unit) {
				case "millisecond": periodPhrase = "per millisecond"; break
				case "second": periodPhrase = "per second"; break
				case "minute": periodPhrase = "per minute"; break
				case "hour": periodPhrase = "per hour"; break
				case "day": periodPhrase = "per day"; break
				case "calendar_day": periodPhrase = "per calendar day"; break
				case "month": periodPhrase = "per month"; break
				case "calendar_month": periodPhrase = "per calendar month"; break
				default: periodPhrase = `per ${unit.replace("_", " ")}`
			}
		} else {
			// Plural units
			let unitName = unit.replace("calendar_", "") + "s"
			if (unit === "day" || unit === "calendar_day") unitName = "days"
			if (unit === "month" || unit === "calendar_month") unitName = "months"

			if (unit.includes("calendar")) {
				unitName += " (UTC)"
			}

			periodPhrase = `every ${duration} ${unitName}`
		}

		let scopePhrase = ""
		switch (mode) {
			case "per_key": scopePhrase = "per key"; break
			case "per_app": scopePhrase = "across all API keys"; break
			case "per_key_and_ip": scopePhrase = "per key + IP"; break
			case "per_app_and_ip": scopePhrase = "shared per IP"; break
			default: scopePhrase = "per key"
		}

		return `${count} requests ${periodPhrase}`
	}

	const rateLimits = apiAuthApp?.rate_limits || [];
	const primaryLimit = rateLimits[0];
	const extraLimitsCount = Math.max(rateLimits.length - 1, 0);


	// Helper functions for zero-filling dates
	const utcDayKey = (date: Date) => date.toISOString().slice(0, 10)
	const utcLabel = (date: Date) =>
		new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)

	const parseUtcDayKey = (key: string) => {
		const [year, month, day] = key.split("-").map(Number)
		return new Date(Date.UTC(year, month - 1, day))
	}

	const pointsByDay = new Map<
		string,
		{ total: number; allowed: number; blocked: number }
	>()
	for (const point of timeseries || []) {
		const key = point.timestamp.slice(0, 10)
		const prev = pointsByDay.get(key) || { total: 0, allowed: 0, blocked: 0 }
		pointsByDay.set(key, {
			total: prev.total + (point.total_requests || 0),
			allowed: prev.allowed + (point.allowed_requests || 0),
			blocked: prev.blocked + (point.blocked_requests || 0),
		})
	}

	const chartData: Array<{
		time: string
		total: number
		allowed: number
		blocked: number
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
			total: point?.total || 0,
			allowed: point?.allowed || 0,
			blocked: point?.blocked || 0,
		})
	}

	if (loading) {
		return (
			<div className="w-full px-4 py-2 md:px-6 md:py-3">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
					<div className="flex items-center gap-2">
						<Skeleton className="h-6 w-24" />
					</div>
					<Skeleton className="h-9 w-[240px] rounded-md" />
				</div>

				<div className="space-y-6">
					<section className="border border-border/30 rounded-xl overflow-hidden">
						<div className="px-4 py-3 border-b border-border/20">
							<Skeleton className="h-3 w-36" />
						</div>
						<div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border/20">
							{Array.from({ length: 4 }).map((_, idx) => (
								<div key={idx} className="p-4 space-y-2">
									<Skeleton className="h-3 w-20" />
									<Skeleton className="h-6 w-16" />
								</div>
							))}
						</div>
					</section>

					<section className="border border-border/30 rounded-xl overflow-hidden">
						<div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-3 w-10" />
						</div>
						<div className="px-4 pt-3 flex items-center gap-4">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-3 w-20" />
						</div>
						<div className="p-4 h-[320px]">
							<div className="h-full space-y-3">
								<Skeleton className="h-4 w-24" />
								<div className="grid grid-cols-7 gap-2 h-[260px] items-end">
									{Array.from({ length: 7 }).map((_, idx) => (
										<Skeleton key={idx} className="h-full w-full rounded-md" />
									))}
								</div>
							</div>
						</div>
					</section>

					<section className="space-y-2">
						<div className="flex items-center gap-4">
							<Skeleton className="h-4 w-4 rounded-full" />
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-px flex-1" />
							<Skeleton className="h-5 w-16 rounded-md" />
						</div>
						<div className="space-y-2">
							{Array.from({ length: 3 }).map((_, idx) => (
								<div
									key={idx}
									className="flex items-center justify-between gap-3 rounded-xl border border-border/30 px-3 py-2"
								>
									<div className="space-y-1">
										<Skeleton className="h-4 w-44" />
										<Skeleton className="h-3 w-28" />
									</div>
									<Skeleton className="h-5 w-16 rounded-md" />
								</div>
							))}
						</div>
					</section>
				</div>
			</div>
		)
	}

	if (!hasSession || !apiAuthApp) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-medium mb-2 text-foreground">Access Required</h2>
					<p className="text-muted-foreground">You dont have access to this resource.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full px-4 py-2 md:px-6 md:py-3">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-normal text-foreground">Overview</h1>

				</div>
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
				<section className="border border-border/30 rounded-xl overflow-hidden">
					<div className="px-4 py-3 border-b border-border/20 text-xs uppercase tracking-wide text-muted-foreground">
						Operations Snapshot
					</div>
					<div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border/20">
						<Metric label="Total Requests" value={analyticsLoading ? "-" : formatNumber(analytics?.total_requests)} />
						<Metric label="Allowed" value={analyticsLoading ? "-" : formatNumber(analytics?.allowed_requests)} />
						<Metric label="Blocked" value={analyticsLoading ? "-" : formatNumber(analytics?.blocked_requests)} />
						<Metric label="Keys Used (24h)" value={analyticsLoading ? "-" : formatNumber(analytics?.keys_used_24h)} />
					</div>
				</section>

				<section className="border border-border/30 rounded-xl overflow-hidden">
					<div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
						<h2 className="text-sm font-normal text-foreground">Traffic Volume</h2>
						<span className="text-xs text-muted-foreground">Daily</span>
					</div>
					<div className="px-4 pt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-emerald-600" />
							Allowed
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span className="w-2 h-2 rounded-full bg-red-500" />
							Blocked
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
										tick={{ fontSize: 11, fill: "#A1A1AA" }}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										dx={-8}
										allowDecimals={false}
										tick={{ fontSize: 11, fill: "#A1A1AA" }}
									/>
									<Tooltip
										cursor={false}
										labelStyle={{ color: "hsl(var(--foreground))", marginBottom: "4px" }}
										contentStyle={{
											backgroundColor: "#0f172a",
											border: "1px solid #334155",
											borderRadius: "8px",
											fontSize: "12px",
											color: "#e2e8f0",
											opacity: 1,
											boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
										}}
										itemStyle={{ color: "#e2e8f0" }}
										formatter={(value: any, name: any) => {
											const key = String(name).toLowerCase()
											const label =
												key.includes("allow") ? "Allowed" :
													key.includes("block") ? "Blocked" :
														"Total"
											return [Number(value).toLocaleString(), label]
										}}
									/>
									<Bar
										dataKey="allowed"
										fill="hsl(142, 76%, 36%)"
										fillOpacity={0.85}
										radius={[3, 3, 0, 0]}
										strokeWidth={0}
										name="Allowed"
										stackId="a"
									/>
									<Bar
										dataKey="blocked"
										fill="hsl(0, 84%, 60%)"
										fillOpacity={0.85}
										radius={[3, 3, 0, 0]}
										strokeWidth={0}
										name="Blocked"
										stackId="a"
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</section>

				{rateLimits.length > 0 && (
					<section className="relative group/group">
						{/* Vertical Rail */}
						<div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10" />

						<div className="flex items-center gap-4 mb-4">
							<div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-background z-10" />
							<h2 className="text-xs font-normal uppercase text-foreground/70">
								Rate Limits
							</h2>
							<div className="h-px flex-1 bg-gradient-to-r from-border/30 to-transparent" />
							<Badge variant="secondary" className="bg-muted/30 text-muted-foreground font-normal border-none text-xs">
								{rateLimits.length} {rateLimits.length === 1 ? 'Rule' : 'Rules'}
							</Badge>
						</div>

						<div className="space-y-2">
							{rateLimits.map((limit, index) => {
								const isExpanded = expandedRateLimits.has(index)
								return (
									<div
										key={index}
										className={cn(
											"group/item transition-all duration-300",
											isExpanded ? "scale-[1.005]" : ""
										)}
									>
										<div
											className={cn(
												"relative border transition-all duration-300 rounded-xl overflow-hidden",
												isExpanded
													? "border-primary/20 bg-primary/[0.01]"
													: "border-border/30 bg-background hover:border-primary/10"
											)}
										>
											<button
												onClick={() => toggleRateLimitExpand(index)}
												className="w-full text-left px-4 py-2 flex items-center gap-3"
											>
												<div className="flex-1 min-w-0 flex items-center gap-3">
													<Activity className="w-4 h-4 text-muted-foreground/50" />
													<span className="text-xs font-normal text-foreground">
														{getRateLimitDescription(limit)}
													</span>
													<Badge variant="secondary" className="text-xs h-4 px-1.5 font-normal bg-muted text-muted-foreground border-none uppercase">
														{limit.mode === "per_app" ? "GLOBAL" : (limit.mode ? limit.mode.replace(/_/g, " ").replace("per", "") : "KEY")}
													</Badge>
												</div>
												<div className={cn(
													"p-1 rounded-lg transition-colors",
													isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground/50 group-hover/item:text-muted-foreground"
												)}>
													{isExpanded ? (
														<ChevronDown className="w-3.5 h-3.5" />
													) : (
														<ChevronRight className="w-3.5 h-3.5" />
													)}
												</div>
											</button>

											{/* Expanded Content */}
											{isExpanded && (
												<div className="border-t border-border/10 py-4 px-4 bg-muted/5 grid grid-cols-2 gap-4 text-xs">
													<div>
														<span className="text-muted-foreground block mb-1">Max Requests</span>
														<span className="text-foreground font-medium">{limit.max_requests.toLocaleString()}</span>
													</div>
													<div>
														<span className="text-muted-foreground block mb-1">Duration</span>
														<span className="text-foreground font-medium capitalize">
															{limit.duration} {limit.unit.replace(/_/g, " ")}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground block mb-1">Unit</span>
														<span className="text-foreground font-medium capitalize">{limit.unit.replace(/_/g, " ")}</span>
													</div>
													{limit.mode && (
														<div>
															<span className="text-muted-foreground block mb-1">Mode</span>
															<span className="text-foreground font-medium capitalize">
																{limit.mode === "per_app" ? "Across all API keys" : (limit.mode?.replace(/_/g, " ").replace("per ", "") || "Key")}
															</span>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								)
							})}
						</div>
					</section>
				)}





			</div>
		</div>
	)
}

function Metric({
	label,
	value,
	compact = false,
	valueClass,
}: {
	label: string
	value: string
	compact?: boolean
	valueClass?: string
}) {
	return (
		<div className={cn("px-4", compact ? "py-4" : "py-3", "bg-transparent")}>
			<div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className={cn(compact ? "text-lg mt-1" : "text-2xl mt-1", "text-foreground font-normal tracking-tight", valueClass)}>{value}</div>
		</div>
	)
}
