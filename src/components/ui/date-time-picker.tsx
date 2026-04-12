"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
	value?: string
	onChange: (value: string) => void
	placeholder?: string
	className?: string
}

const toLocalInputValue = (date: Date) => {
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const parseLocalInputValue = (value?: string) => {
	if (!value) return undefined
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? undefined : date
}

export function DateTimePicker({
	value,
	onChange,
	placeholder = "Select date and time",
	className,
}: DateTimePickerProps) {
	const [open, setOpen] = React.useState(false)
	const [selected, setSelected] = React.useState<Date | undefined>(parseLocalInputValue(value))

	React.useEffect(() => {
		setSelected(parseLocalInputValue(value))
	}, [value])

	const update = (date?: Date) => {
		setSelected(date)
		onChange(date ? toLocalInputValue(date) : "")
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						"h-8 w-full justify-start border-border/40 bg-background px-2.5 text-left text-xs font-normal",
						!selected && "text-muted-foreground",
						className
					)}
				>
					<CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
					{selected ? format(selected, "MMM dd, yyyy HH:mm") : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto border-border/60 p-0">
				<div className="p-2">
					<Calendar
						mode="single"
						selected={selected}
						onSelect={(day) => {
							if (!day) {
								update(undefined)
								return
							}
							const current = selected ?? new Date()
							const next = new Date(day)
							next.setHours(current.getHours(), current.getMinutes(), 0, 0)
							update(next)
						}}
					/>
				</div>
				<div className="border-t border-border/40 p-3 pt-2">
					<div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
						<Clock3 className="h-3 w-3" />
						Time
					</div>
					<Input
						type="time"
						step={60}
						value={selected ? format(selected, "HH:mm") : ""}
						onChange={(e) => {
							const [h, m] = e.target.value.split(":").map(Number)
							const base = selected ?? new Date()
							const next = new Date(base)
							next.setHours(h || 0, m || 0, 0, 0)
							update(next)
						}}
						className="h-8 border-border/40 bg-background text-xs"
					/>
				</div>
			</PopoverContent>
		</Popover>
	)
}
