"use client"

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
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
			<div className="rounded-lg border border-border/50 bg-card p-3 shadow-sm">
				<div className="text-xs font-normal text-muted-foreground uppercase mb-1 tracking-wider">Total Deliveries</div>
				<div className="text-xl md:text-2xl text-foreground font-normal">
					{analyticsLoading ? "—" : formatNumber(totalDeliveries)}
				</div>
			</div>
			<div className="rounded-lg border border-border/50 bg-card p-3 shadow-sm">
				<div className="text-xs font-normal text-muted-foreground uppercase mb-1 tracking-wider">Success Rate</div>
				<div className="text-xl md:text-2xl font-normal">
					{analyticsLoading ? "—" : `${(successRate || 0).toFixed(1)}%`}
				</div>
			</div>
			<div className="rounded-lg border border-border/50 bg-card p-3 shadow-sm">
				<div className="text-xs font-normal text-muted-foreground uppercase  mb-1 tracking-wider">Avg Response</div>
				<div className="text-xl md:text-2xl text-foreground font-normal">
					{analyticsLoading ? "—" : `${Math.round(avgResponseTimeMs || 0)}ms`}
				</div>
			</div>
			<div className="rounded-lg border border-border/50 bg-card p-3 shadow-sm">
				<div className="text-xs font-normal text-muted-foreground uppercase mb-1 tracking-wider">Failed</div>
				<div className="text-xl md:text-2xl text-foreground font-normal">
					{analyticsLoading ? "—" : formatNumber(failed)}
				</div>
			</div>
		</div>
	)
}
