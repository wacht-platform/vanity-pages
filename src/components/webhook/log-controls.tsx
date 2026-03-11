"use client"

import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { ReplayTaskStatusResponse } from "@wacht/types"
import { Download, Filter, Loader2, RotateCcw } from "lucide-react"

type Option = {
	value: string
	label: string
}

type Props = {
	controlClassName: string
	filterStatus: string
	onFilterStatusChange: (value: string) => void
	filterEventName: string
	onFilterEventNameChange: (value: string) => void
	filterEndpointId?: string
	onFilterEndpointIdChange?: (value: string) => void
	eventOptions: Option[]
	endpointOptions?: Option[]
	onResetFilters: () => void
	replayPopoverOpen: boolean
	onReplayPopoverOpenChange: (open: boolean) => void
	activeReplayCount?: number
	replayStatus: string
	onReplayStatusChange: (value: string) => void
	replayEventName: string
	onReplayEventNameChange: (value: string) => void
	replayEndpointId?: string
	onReplayEndpointIdChange?: (value: string) => void
	replayStartDateTime: string
	onReplayStartDateTimeChange: (value: string) => void
	replayEndDateTime: string
	onReplayEndDateTimeChange: (value: string) => void
	isReplayRangeInvalid: boolean
	replayRangeLoading: boolean
	onQueueReplay: () => void
	replayJobs: ReplayTaskStatusResponse[]
	onRefreshReplayJobs: () => void
	onCancelReplayJob?: (taskId: string) => void
	onExportCsv: () => void
}

export function WebhookLogControls({
	controlClassName,
	filterStatus,
	onFilterStatusChange,
	filterEventName,
	onFilterEventNameChange,
	filterEndpointId,
	onFilterEndpointIdChange,
	eventOptions,
	endpointOptions,
	onResetFilters,
	replayPopoverOpen,
	onReplayPopoverOpenChange,
	activeReplayCount = 0,
	replayStatus,
	onReplayStatusChange,
	replayEventName,
	onReplayEventNameChange,
	replayEndpointId,
	onReplayEndpointIdChange,
	replayStartDateTime,
	onReplayStartDateTimeChange,
	replayEndDateTime,
	onReplayEndDateTimeChange,
	isReplayRangeInvalid,
	replayRangeLoading,
	onQueueReplay,
	replayJobs,
	onRefreshReplayJobs,
	onCancelReplayJob,
	onExportCsv,
}: Props) {
	const showEndpointFilter = typeof filterEndpointId === "string" && !!onFilterEndpointIdChange && !!endpointOptions
	const showReplayEndpointFilter = typeof replayEndpointId === "string" && !!onReplayEndpointIdChange && !!endpointOptions
	const isCancelable = (status: string) => status === "queued" || status === "running"

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" size="sm" className={cn(controlClassName)} aria-label="Filters">
						<Filter className="w-3.5 h-3.5" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[360px] rounded-lg border-border/60 bg-popover p-4 shadow-lg">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="text-xs uppercase tracking-wide text-muted-foreground">Delivery Filters</div>
							<Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onResetFilters}>
								Reset
							</Button>
						</div>
						<div className="space-y-2">
							<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</div>
							<Select value={filterStatus} onValueChange={onFilterStatusChange}>
								<SelectTrigger className="h-8 w-full border-border/40 bg-card text-xs font-normal">
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="success">Success (2xx)</SelectItem>
									<SelectItem value="failed">Failed (4xx/5xx)</SelectItem>
									<SelectItem value="filtered">Filtered</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Event</div>
							<Select value={filterEventName} onValueChange={onFilterEventNameChange}>
								<SelectTrigger className="h-8 w-full border-border/40 bg-card text-xs font-normal">
									<SelectValue placeholder="All Events" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Events</SelectItem>
									{eventOptions.map((event) => (
										<SelectItem key={event.value} value={event.value}>
											{event.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{showEndpointFilter ? (
							<div className="space-y-2">
								<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Endpoint</div>
								<Select value={filterEndpointId} onValueChange={onFilterEndpointIdChange}>
									<SelectTrigger className="h-8 w-full border-border/40 bg-card text-xs font-normal">
										<SelectValue placeholder="All Endpoints" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Endpoints</SelectItem>
										{endpointOptions.map((endpoint) => (
											<SelectItem key={endpoint.value} value={endpoint.value}>
												{endpoint.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : null}
					</div>
				</PopoverContent>
			</Popover>

			<Popover open={replayPopoverOpen} onOpenChange={onReplayPopoverOpenChange}>
				<PopoverTrigger asChild>
					<Button variant="outline" size="sm" className={cn("relative", controlClassName)} aria-label="Replay">
						<RotateCcw className="w-3.5 h-3.5" />
						{activeReplayCount > 0 ? (
							<span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
								{activeReplayCount}
							</span>
						) : null}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-[360px] rounded-lg border-border/60 bg-popover p-4 shadow-lg">
					<Tabs defaultValue="create" className="gap-3">
						<TabsList className="grid h-8 w-full grid-cols-2">
							<TabsTrigger value="create" className="text-xs">Create Job</TabsTrigger>
							<TabsTrigger value="past" className="text-xs">Past Jobs</TabsTrigger>
						</TabsList>
						<TabsContent value="create" className="space-y-4">
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-2">
									<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</div>
									<Select value={replayStatus} onValueChange={onReplayStatusChange}>
										<SelectTrigger className="h-8 w-full border-border/40 bg-card text-xs font-normal">
											<SelectValue placeholder="All Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Status</SelectItem>
											<SelectItem value="success">Success (2xx)</SelectItem>
											<SelectItem value="failed">Failed (4xx/5xx)</SelectItem>
											<SelectItem value="filtered">Filtered</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Event</div>
									<Select value={replayEventName} onValueChange={onReplayEventNameChange}>
										<SelectTrigger className="h-8 w-full border-border/40 bg-card text-xs font-normal">
											<SelectValue placeholder="All Events" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Events</SelectItem>
											{eventOptions.map((event) => (
												<SelectItem key={event.value} value={event.value}>
													{event.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							{showReplayEndpointFilter ? (
								<div className="space-y-2">
									<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Endpoint</div>
									<Select value={replayEndpointId} onValueChange={onReplayEndpointIdChange}>
										<SelectTrigger className="h-8 w-full border-border/40 bg-card text-xs font-normal">
											<SelectValue placeholder="All Endpoints" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Endpoints</SelectItem>
											{endpointOptions.map((endpoint) => (
												<SelectItem key={endpoint.value} value={endpoint.value}>
													{endpoint.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							) : null}
							<div className="space-y-2">
								<div className="text-[11px] uppercase tracking-wide text-muted-foreground">Start Date/Time</div>
								<DateTimePicker
									value={replayStartDateTime}
									onChange={onReplayStartDateTimeChange}
									placeholder="Select start date and time"
								/>
							</div>
							<div className="space-y-2">
								<div className="text-[11px] uppercase tracking-wide text-muted-foreground">End Date/Time (optional)</div>
								<DateTimePicker
									value={replayEndDateTime}
									onChange={onReplayEndDateTimeChange}
									placeholder="Select end date and time"
								/>
							</div>
							{isReplayRangeInvalid ? (
								<div className="text-[11px] text-red-500">End date/time must be after start date/time.</div>
							) : null}
							<Button
								variant="default"
								size="sm"
								onClick={onQueueReplay}
								disabled={!replayStartDateTime || replayRangeLoading || isReplayRangeInvalid}
								className="h-8 w-full"
								aria-label="Run replay"
							>
								{replayRangeLoading ? (
									<>
										<Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" />
										Queuing...
									</>
								) : (
									<>
										<RotateCcw className="mr-2 w-3.5 h-3.5" />
										Queue Replay
									</>
								)}
							</Button>
						</TabsContent>
						<TabsContent value="past" className="space-y-2">
							<div className="flex items-center justify-between">
								<div className="text-xs uppercase tracking-wide text-muted-foreground">Latest Jobs</div>
								<Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onRefreshReplayJobs}>
									Refresh
								</Button>
							</div>
							{replayJobs.length === 0 ? (
								<div className="text-xs text-muted-foreground">No replay jobs found.</div>
							) : (
								<div className="max-h-72 space-y-1 overflow-y-auto pr-1">
									{replayJobs.map((job) => (
										<div key={job.task_id} className="rounded-lg border border-border/40 p-2.5">
											<div className="flex items-center justify-between gap-2">
												<div className="truncate text-[11px] text-foreground">{job.task_id}</div>
												<div className="flex items-center gap-2">
													<div className="text-[11px] capitalize text-muted-foreground">{job.status}</div>
													{onCancelReplayJob && isCancelable(job.status) ? (
														<Button
															variant="ghost"
															size="sm"
															className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
															onClick={() => onCancelReplayJob(job.task_id)}
														>
															Stop
														</Button>
													) : null}
												</div>
											</div>
											<div className="mt-1 text-[11px] text-muted-foreground">
												Processed {job.processed}/{job.total_count || "?"} • Replayed {job.replayed_count} • Failed {job.failed_count}
											</div>
											{job.created_at ? (
												<div className="mt-1 text-[10px] text-muted-foreground/80">
													Created {new Date(job.created_at).toLocaleString()}
												</div>
											) : null}
										</div>
									))}
								</div>
							)}
						</TabsContent>
					</Tabs>
				</PopoverContent>
			</Popover>

			<Button variant="outline" size="sm" className={cn(controlClassName)} onClick={onExportCsv} aria-label="Export CSV">
				<Download className="w-3.5 h-3.5" />
			</Button>
		</>
	)
}
