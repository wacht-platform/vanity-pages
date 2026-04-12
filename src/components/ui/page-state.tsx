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
		<div className={cn("flex min-h-[48vh] items-center justify-center px-4 py-10 font-sans", className)}>
			<div className="w-full max-w-md text-center text-foreground">
				{icon ? (
					<div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-border/60 bg-muted/35 text-foreground">
						{icon}
					</div>
				) : null}
				<h1 className="text-base font-normal text-foreground">{title}</h1>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
			</div>
		</div>
	)
}
