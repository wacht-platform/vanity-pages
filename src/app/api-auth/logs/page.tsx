"use client"

import { useEffect, useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Filter } from "lucide-react"
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

	const outcomeClass = (value: string) =>
		value === "allowed" ? "bg-green-500" : value === "blocked" ? "bg-red-500" : "bg-muted-foreground"

	return (
		<div className="w-full px-4 py-2 md:px-6 md:py-3">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-normal text-foreground">Access Logs</h1>
				</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
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
					<Select value={outcome} onValueChange={(value) => { setOutcome(value) }}>
						<SelectTrigger className="w-full sm:w-[160px] h-9 bg-muted/30 border-none shadow-none text-sm">
							<div className="flex items-center gap-2">
								<Filter className="w-3.5 h-3.5" />
								<SelectValue placeholder="Outcome" />
							</div>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Outcomes</SelectItem>
							<SelectItem value="allowed">Allowed</SelectItem>
							<SelectItem value="blocked">Blocked</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Timeline View */}
			{loading && logs.length === 0 ? (
				<div className="space-y-10">
					{[1, 2].map(group => (
						<div key={group} className="relative">
							<div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-muted/10 -z-10" />
							<div className="flex items-center gap-4 mb-4">
								<div className="w-4 h-4 rounded-full border-2 border-muted/20 bg-background z-10" />
								<div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
								<div className="h-px flex-1 bg-muted/10" />
							</div>
							<div className="space-y-2">
								{[1, 2, 3].map(i => (
									<div key={i} className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
								))}
							</div>
						</div>
					))}
				</div>
			) : groupedLogs.length === 0 ? (
				<div className="text-center py-16 border border-dashed border-border/40 rounded-xl bg-muted/5">
					<p className="text-sm font-normal text-muted-foreground">No logs found matching your criteria.</p>
				</div>
			) : (
				<div className="space-y-10">
					{groupedLogs.map(([date, items]: [string, ApiAuditLog[]]) => (
						<div key={date} className="relative group/group">
							{/* Rail Removed */}

							<div className="flex items-center gap-4 mb-4">
								<div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-background z-10" />
								<h2 className="text-xs font-normal uppercase text-foreground/70">
									{date}
								</h2>
								<div className="h-px flex-1 bg-gradient-to-r from-border/30 to-transparent" />
							</div>

							<div className="space-y-2">
								{items.map((log: ApiAuditLog) => (
									<div key={log.request_id} className="group/item">

										<div
											className={cn(
												"flex-1 flex items-center justify-between gap-4 px-4 py-2 border transition-all duration-300 rounded-xl overflow-hidden",
												"border-border/30 bg-background hover:border-sidebar-accent hover:bg-muted/5"
											)}
										>
											<div className="flex-1 min-w-0 flex items-center gap-4">
												<div className="flex items-center gap-3 min-w-0">
													<span className="text-sm font-normal text-foreground truncate max-w-[300px] md:max-w-[500px]">
														{log.path}
													</span>
													<span className="text-muted-foreground/30 text-xs">|</span>
													<span className="text-xs text-muted-foreground/50 font-normal">
														{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
													</span>
												</div>

												<div className="hidden md:flex items-center gap-4 shrink-0 font-normal">
													<span className="text-muted-foreground/20 text-[10px]">•</span>
													<div className="text-xs text-muted-foreground/60">
														{log.key_name || log.key_id}
													</div>
												</div>
											</div>

											<div className="flex items-center justify-end gap-6 shrink-0 font-normal">
												<div className="flex items-center gap-4">
													<Badge variant="outline" className={cn(
														"text-[10px] px-2 py-0 h-4 border-0 bg-opacity-10 uppercase tracking-wider font-normal",
														outcomeClass(log.outcome).replace("bg-", "bg-") + "/10"
													)}>
														{log.outcome}
													</Badge>
												</div>
											</div>
										</div>
									</div>
								))}
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
						className="h-8 px-3 border-border/40 text-xs font-normal hover:bg-muted/50 transition-all rounded-lg"
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setPage(p => p + 1)}
						disabled={!has_more || loading}
						className="h-8 px-3 border-border/40 text-xs font-normal hover:bg-muted/50 transition-all rounded-lg"
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	)
}
