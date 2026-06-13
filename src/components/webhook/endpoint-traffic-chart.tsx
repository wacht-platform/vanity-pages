"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

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
		<section className="rounded-[10px] border border-border bg-card p-[18px]">
			<div className="mb-3.5 flex items-start justify-between gap-4">
				<div>
					<h3 className="text-[14px] font-medium leading-[1.2] text-foreground">Traffic volume</h3>
					<p className="mt-1 text-[12px] text-muted-foreground">Deliveries per day · UTC</p>
				</div>
				<div className="flex flex-wrap items-center gap-3.5">
					<span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="size-2 rounded-full bg-success" />
						Successful
					</span>
					<span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="size-2 rounded-full bg-error" />
						Failed
					</span>
					<span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="size-2 rounded-full bg-warning" />
						Filtered
					</span>
					<span className="inline-flex h-6 items-center rounded-[4px] border border-border bg-secondary px-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
						Daily
					</span>
				</div>
			</div>
			<div className="h-[300px]">
				{loading ? (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading...</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} barCategoryGap="18%" margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
							<XAxis dataKey="time" axisLine={false} tickLine={false} dy={8} minTickGap={20} interval="preserveStartEnd" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
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
								formatter={(value: ValueType | undefined, name: NameType | undefined) => {
									const key = String(name).toLowerCase()
									const label =
										key.includes("success") ? "Successful" :
											key.includes("fail") ? "Failed" :
												"Filtered"
									return [Number(value ?? 0).toLocaleString(), label]
								}}
							/>
							<Bar dataKey="successful" name="Successful" fill="var(--wa-success)" fillOpacity={0.85} radius={[3, 3, 0, 0]} strokeWidth={0} />
							<Bar dataKey="failed" name="Failed" fill="var(--wa-error)" fillOpacity={0.85} radius={[3, 3, 0, 0]} strokeWidth={0} />
							<Bar dataKey="filtered" name="Filtered" fill="var(--wa-warning)" fillOpacity={0.9} radius={[3, 3, 0, 0]} strokeWidth={0} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		</section>
	)
}
