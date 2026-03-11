"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

type ChartPoint = {
	time: string
	successful: number
	failed: number
	filtered: number
}

type Props = {
	loading: boolean
	data: ChartPoint[]
}

export function EndpointTrafficChart({ loading, data }: Props) {
	return (
		<div className="flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm">
			<div className="flex items-center justify-between border-b border-border/40 bg-secondary/40 px-4 py-3">
				<h3 className="text-sm font-normal text-foreground">Traffic Volume</h3>
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
				{loading ? (
					<div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} barCategoryGap="18%" margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
							<XAxis dataKey="time" axisLine={false} tickLine={false} dy={10} minTickGap={20} interval="preserveStartEnd" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
							<YAxis axisLine={false} tickLine={false} dx={-8} allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
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
								formatter={(value: number | string | undefined, name: string | undefined) => {
									const key = String(name).toLowerCase()
									const label =
										key.includes("success") ? "Successful" :
											key.includes("fail") ? "Failed" :
												"Filtered"
									return [Number(value ?? 0).toLocaleString(), label]
								}}
							/>
							<Bar dataKey="successful" name="Successful" fill="hsl(142, 76%, 36%)" fillOpacity={0.85} radius={[3, 3, 0, 0]} strokeWidth={0} />
							<Bar dataKey="failed" name="Failed" fill="hsl(0, 84%, 60%)" fillOpacity={0.85} radius={[3, 3, 0, 0]} strokeWidth={0} />
							<Bar dataKey="filtered" name="Filtered" fill="hsl(38, 92%, 50%)" fillOpacity={0.9} radius={[3, 3, 0, 0]} strokeWidth={0} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	)
}
