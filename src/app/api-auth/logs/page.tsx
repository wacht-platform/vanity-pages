"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Filter, ChevronRight } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"
import { useApiAuthAuditLogs } from "@wacht/nextjs"
import type { ApiAuditLog } from "@wacht/types"

export default function ApiAuthLogsPage() {
	const [page, setPage] = useState(1)
	const [limit] = useState(25)
	const [outcome, setOutcome] = useState<string>("all")
	const [cursors, setCursors] = useState<string[]>([])
	const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
		from: addDays(new Date(), -7),
		to: new Date(),
	})

	const startDate = useMemo(() => {
		const d = new Date(dateRange?.from || addDays(new Date(), -7))
		d.setHours(0, 0, 0, 0)
		return d.toISOString()
	}, [dateRange?.from])

	const endDate = useMemo(() => {
		const d = new Date(dateRange?.to || new Date())
		d.setHours(23, 59, 59, 999)
		return d.toISOString()
	}, [dateRange?.to])

	const cursor = page > 1 ? cursors[page - 2] : undefined

	const { logs, has_more, next_cursor, loading } = useApiAuthAuditLogs({
		limit,
		cursor,
		outcome: outcome === "all" ? undefined : (outcome as "allowed" | "blocked"),
		start_date: startDate,
		end_date: endDate,
	})

	useEffect(() => {
		setPage(1)
		setCursors([])
	}, [outcome, startDate, endDate])

	useEffect(() => {
		if (next_cursor && page === cursors.length + 1) {
			setCursors(prev => [...prev, next_cursor])
		}
	}, [next_cursor, page, cursors.length])



	const groupedLogs = useMemo(() => {
		if (!logs) return []
		const groups: Record<string, ApiAuditLog[]> = {}
		logs.forEach((log: ApiAuditLog) => {
			const date = new Date(log.timestamp).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			})
			if (!groups[date]) groups[date] = []
			groups[date].push(log)
		})
		return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
	}, [logs])

	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
			<div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row">
				<div className="min-w-0">
					<div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
						Credentials
					</div>
					<h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
						Access logs
					</h1>
					<p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
						Every authenticated request, with the key it used and the
						outcome.
					</p>
				</div>
				<div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
					<DateRangePicker
						className="w-full sm:w-auto"
						value={dateRange}
						onChange={(range) => {
							if (!range || !range.from || !range.to || range.from > range.to) {
								setDateRange({
									from: addDays(new Date(), -7),
									to: new Date(),
								})
							} else {
								setDateRange({ from: range.from, to: range.to })
							}
						}}
					/>
					<Select value={outcome} onValueChange={(value) => setOutcome(value)}>
						<SelectTrigger className="h-[30px] w-full text-[12px] sm:w-[150px]">
							<div className="flex items-center gap-2">
								<Filter className="h-3.5 w-3.5" />
								<SelectValue placeholder="Outcome" />
							</div>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All outcomes</SelectItem>
							<SelectItem value="allowed">Allowed</SelectItem>
							<SelectItem value="blocked">Blocked</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{loading && logs.length === 0 ? (
				<div className="space-y-7">
					{[0, 1].map((g) => (
						<div key={g}>
							<div className="mb-2.5 flex items-center gap-3">
								<span className="h-3 w-24 animate-pulse rounded bg-muted" />
								<span className="h-px flex-1 bg-border" />
							</div>
							<div className="overflow-hidden rounded-lg border border-border bg-card">
								{[0, 1, 2, 3].map((i) => (
									<div key={i} className="flex items-center gap-3 px-[18px] py-[11px]">
										<span className="h-[22px] w-16 animate-pulse rounded-[4px] bg-muted" />
										<span className="h-3 flex-1 animate-pulse rounded bg-muted" />
										<span className="h-3 w-20 animate-pulse rounded bg-muted" />
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			) : groupedLogs.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-muted/30 py-16 text-center">
					<p className="text-sm text-muted-foreground">
						No logs found matching your criteria.
					</p>
				</div>
			) : (
				<div className="space-y-7">
					{groupedLogs.map(([date, items]: [string, ApiAuditLog[]]) => (
						<div key={date}>
							{/* Day separator */}
							<div className="mb-2.5 flex items-center gap-3">
								<span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
									{date}
								</span>
								<span className="h-px flex-1 bg-border" />
								<span className="font-mono text-[11px] text-muted-foreground/70">
									{items.length}{" "}
									{items.length === 1 ? "request" : "requests"}
								</span>
							</div>
							<div className="overflow-x-auto rounded-lg border border-border bg-card">
								<div className="min-w-[640px] divide-y divide-border">
									{items.map((log: ApiAuditLog) => {
										const allowed = log.outcome === "allowed"
										return (
											<div
												key={log.request_id}
												className="grid grid-cols-[96px_1fr_140px_104px_20px] items-center gap-3 px-[18px] py-[11px] transition-colors hover:bg-accent/50"
											>
												<span
													className={cn(
														"inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
														allowed
															? "border-success/30 bg-success-soft text-success"
															: "border-destructive/25 bg-destructive/10 text-destructive",
													)}
												>
													<span
														className={cn(
															"size-1.5 rounded-full",
															allowed
																? "bg-success"
																: "bg-destructive",
														)}
													/>
													{log.outcome}
												</span>
												<span
													className="truncate font-mono text-[12px] text-foreground/80"
													title={log.path}
												>
													{log.path}
												</span>
												<span
													className="truncate font-mono text-[11px] text-muted-foreground"
													title={log.key_name || log.key_id}
												>
													{log.key_name || log.key_id}
												</span>
												<span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
													{new Date(
														log.timestamp,
													).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
														second: "2-digit",
													})}
												</span>
												<ChevronRight className="h-3.5 w-3.5 justify-self-end text-muted-foreground/50" />
											</div>
										)
									})}
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
				<div className="text-xs text-muted-foreground font-normal tracking-tight">
					Page {page}
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
						className="h-8 px-3 border-border text-xs font-normal hover:bg-muted/50 transition-all rounded-lg"
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(p => p + 1)}
						disabled={!has_more || loading}
						className="h-8 px-3 border-border text-xs font-normal hover:bg-muted/50 transition-all rounded-lg"
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	)
}
