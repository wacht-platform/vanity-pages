"use client"

import { cn } from "@/lib/utils"

type Props = {
	analyticsLoading: boolean
	totalDeliveries?: number
	successRate?: number
	avgResponseTimeMs?: number
	failed?: number
}

function formatNumber(num?: number) {
	if (num === undefined || num === null) return "—"
	return num.toLocaleString()
}

export function EndpointStatsGrid({
	analyticsLoading,
	totalDeliveries,
	successRate,
	avgResponseTimeMs,
	failed,
}: Props) {
	return (
		<div className="overflow-hidden rounded-[10px] border border-border bg-card">
			<div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-4 lg:divide-y-0">
				<Cell label="Total deliveries" value={analyticsLoading ? "—" : formatNumber(totalDeliveries)} />
				<Cell
					label="Success rate"
					value={analyticsLoading ? "—" : `${(successRate || 0).toFixed(1)}%`}
					valueClass="text-success"
				/>
				<Cell label="Avg response" value={analyticsLoading ? "—" : `${Math.round(avgResponseTimeMs || 0)}ms`} />
				<Cell label="Failed" value={analyticsLoading ? "—" : formatNumber(failed)} />
			</div>
		</div>
	)
}

function Cell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
	return (
		<div className="flex flex-col gap-1.5 px-[22px] py-[18px]">
			<div className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
				{label}
			</div>
			<div className={cn("text-[24px] font-medium leading-[1.1] tracking-[-0.012em] tabular-nums text-foreground", valueClass)}>
				{value}
			</div>
		</div>
	)
}
