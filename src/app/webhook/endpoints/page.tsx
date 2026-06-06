"use client"

import { useState } from "react"
import { useWebhookEndpoints, useWebhookEvents } from "@wacht/nextjs"
import { useWebhookApp } from "@/components/webhook-provider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Globe, MoreHorizontal, Zap, ChevronRight } from "lucide-react"
import type { EndpointWithSubscriptions } from "@wacht/types"
import { CreateEndpointDialog } from "@/components/webhook/create-endpoint-dialog"
import { EditEndpointDialog } from "@/components/webhook/edit-endpoint-dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function WebhookEndpointsPage() {
	const router = useRouter()
	const { endpoints, loading: endpointsLoading, refetch } = useWebhookEndpoints()
	const { deleteEndpoint } = useWebhookApp()

	const [createDialogOpen, setCreateDialogOpen] = useState(false)

	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [editingEndpoint, setEditingEndpoint] = useState<EndpointWithSubscriptions | null>(null)

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [deletingEndpoint, setDeletingEndpoint] = useState<EndpointWithSubscriptions | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)


	const handleEditClick = (endpoint: EndpointWithSubscriptions) => {
		setEditingEndpoint(endpoint)
		setEditDialogOpen(true)
	}


	const handleDeleteClick = (endpoint: EndpointWithSubscriptions) => {
		setDeletingEndpoint(endpoint)
		setDeleteDialogOpen(true)
	}

	const handleDeleteEndpoint = async () => {
		if (!deletingEndpoint) return

		setIsDeleting(true)

		try {
			await deleteEndpoint(deletingEndpoint.id)

			setDeleteDialogOpen(false)
			setDeletingEndpoint(null)
			refetch()
		} catch (err) {
			console.error("Failed to delete endpoint:", err)
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<>
			<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
				<div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row">
					<div className="min-w-0">
						<div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
							Webhooks
						</div>
						<h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
							Endpoints
						</h1>
						<p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
							URLs Wacht will POST to when subscribed events fire.
						</p>
					</div>
					<Button size="sm" onClick={() => setCreateDialogOpen(true)} className="h-[30px] shrink-0">
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						<span className="hidden sm:inline">Create endpoint</span>
						<span className="sm:hidden">Create</span>
					</Button>
					<CreateEndpointDialog
						open={createDialogOpen}
						onOpenChange={setCreateDialogOpen}
						refetch={refetch}
					/>
				</div>

				{/* Edit Endpoint Dialog */}
				<EditEndpointDialog
					endpoint={editingEndpoint}
					open={editDialogOpen}
					onOpenChange={setEditDialogOpen}
					refetch={refetch}
				/>

				{/* Delete Endpoint Dialog */}
				<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
					<DialogContent className="sm:max-w-[400px]">
						<DialogHeader>
							<DialogTitle className="text-base">Delete Endpoint</DialogTitle>
							<DialogDescription className="text-xs">
								Are you sure you want to delete this endpoint? This action cannot be undone.
							</DialogDescription>
						</DialogHeader>

						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
								Cancel
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleDeleteEndpoint}
								disabled={isDeleting}
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</Button>
						</div>
					</DialogContent>
				</Dialog>

				{/* Endpoints list */}
				{endpointsLoading ? (
					<div className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-card">
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex items-center gap-3 px-[18px] py-[14px]">
								<span className="size-1.5 shrink-0 animate-pulse rounded-full bg-muted" />
								<span className="h-3 flex-1 animate-pulse rounded bg-muted" />
								<span className="h-[22px] w-16 animate-pulse rounded-[4px] bg-muted" />
							</div>
						))}
					</div>
				) : !Array.isArray(endpoints) || endpoints.length === 0 ? (
					<div className="rounded-[10px] border border-dashed border-border bg-muted/30 py-14 text-center">
						<div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
							<Globe className="h-5 w-5" />
						</div>
						<p className="text-sm text-muted-foreground">No endpoints configured</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Create your first endpoint to start receiving webhooks.
						</p>
					</div>
				) : (
					<div className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-card">
						{endpoints.map((endpoint) => (
							<div
								key={endpoint.id}
								className="group flex cursor-pointer items-center gap-3 px-[18px] py-[14px] transition-colors hover:bg-accent/50"
								onClick={() => router.push(`/webhook/endpoints/${endpoint.id}`)}
							>
								<span
									className={cn(
										"size-1.5 shrink-0 rounded-full",
										endpoint.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
									)}
								/>
								<span
									className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground/80"
									title={endpoint.url}
								>
									{endpoint.url}
								</span>
								<span className="hidden shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground md:inline-flex">
									<Zap className="h-3.5 w-3.5 text-muted-foreground/70" />
									{endpoint.subscribed_events.length}{" "}
									{endpoint.subscribed_events.length === 1 ? "event" : "events"}
								</span>
								<span
									className={cn(
										"inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
										endpoint.is_active
											? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
											: "border-border bg-foreground/[0.04] text-muted-foreground",
									)}
								>
									<span
										className={cn(
											"size-1.5 rounded-full",
											endpoint.is_active ? "bg-emerald-500" : "bg-muted-foreground/40",
										)}
									/>
									{endpoint.is_active ? "active" : "inactive"}
								</span>
								<div
									className="flex shrink-0 items-center gap-1"
									onClick={(e) => e.stopPropagation()}
								>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="sm"
												className="size-7 p-0 text-muted-foreground hover:text-foreground"
												onClick={(e) => e.stopPropagation()}
											>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-[160px]">
											<DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleEditClick(endpoint)}>
												Edit configuration
											</DropdownMenuItem>
											<div className="my-1 h-px bg-border" />
											<DropdownMenuItem className="cursor-pointer text-xs text-destructive focus:text-destructive" onClick={() => handleDeleteClick(endpoint)}>
												Delete endpoint
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
									<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	)
}
