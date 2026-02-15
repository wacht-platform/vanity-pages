"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
	className?: string
	value?: { from: Date; to?: Date }
	onChange?: (range: { from?: Date; to?: Date } | undefined) => void
}

export function DateRangePicker({
	className,
	value,
	onChange,
}: DateRangePickerProps) {
	const handleSelect = React.useCallback(
		(range: { from?: Date; to?: Date } | undefined) => {
			if (!range) {
				onChange?.(range)
				return
			}

			const normalized = { ...range }
			if (normalized.from) {
				const start = new Date(normalized.from)
				start.setHours(0, 0, 0, 0)
				normalized.from = start
			}
			if (normalized.to) {
				const end = new Date(normalized.to)
				end.setHours(23, 59, 59, 999)
				normalized.to = end
			}

			onChange?.(normalized)
		},
		[onChange]
	)

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={"outline"}
						className={cn(
							"w-full justify-start text-left font-normal h-8 bg-muted/30 border-none shadow-none text-xs",
							!value && "text-muted-foreground"
						)}
					>
						<CalendarIcon className="mr-2 h-3.5 w-3.5" />
						{value?.from ? (
							value.to ? (
								<>
									{format(value.from, "LLL dd, y")} -{" "}
									{format(value.to, "LLL dd, y")}
								</>
							) : (
								format(value.from, "LLL dd, y")
							)
						) : (
							<span>Pick a date range</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={value?.from}
						selected={value}
						onSelect={handleSelect}
						numberOfMonths={2}
						className="text-xs"
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
