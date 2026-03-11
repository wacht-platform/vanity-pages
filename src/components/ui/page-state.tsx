"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type PageStateProps = {
	title: string
	description: string
	icon?: React.ReactNode
	className?: string
}

export function PageState({ title, description, icon, className }: PageStateProps) {
	return (
		<div className={cn("flex min-h-[60vh] items-center justify-center px-6 py-10", className)}>
			<div className="w-full max-w-md rounded-lg border border-border/50 bg-card px-8 py-8 text-center text-card-foreground shadow-sm">
				{icon ? (
					<div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-secondary text-card-foreground">
						{icon}
					</div>
				) : null}
				<h1 className="text-xl text-card-foreground">{title}</h1>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
			</div>
		</div>
	)
}
