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
			<div className="px-4 py-2 md:px-6 md:py-3">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
					<div>
						<h1 className="text-lg font-normal text-foreground">Endpoints</h1>
					</div>
					<Button size="sm" onClick={() => setCreateDialogOpen(true)} className="h-8 text-xs md:text-sm shadow-sm hover:shadow-md transition-all">
						<Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
						<span className="hidden sm:inline">Create Endpoint</span>
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

				{/* Endpoints List */}
				<div className="relative">
					{/* Vertical Rail */}
					{!endpointsLoading && Array.isArray(endpoints) && endpoints.length > 0 && (
						<div className="absolute left-[7px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10" />
					)}

					<div className="space-y-2">
						{endpointsLoading ? (
							<div className="space-y-2">
								{[1, 2, 3].map(i => (
									<div key={i} className="flex items-center gap-4">
										<div className="w-4 h-4 rounded-full border-2 border-border/40 bg-card z-10" />
										<div className="h-10 flex-1 animate-pulse rounded-lg border border-border/40 bg-card" />
									</div>
								))}
							</div>
						) : !Array.isArray(endpoints) || endpoints.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border/60 bg-secondary/30 py-12 text-center">
								<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
									<Globe className="w-6 h-6 text-muted-foreground/30" />
								</div>
								<p className="text-sm font-normal text-muted-foreground">No endpoints configured</p>
								<p className="text-xs text-muted-foreground/50 mt-1">Create your first endpoint to start receiving webhooks.</p>
							</div>
						) : (
							endpoints.map((endpoint) => (
								<div
									key={endpoint.id}
									className="group/item"
								>
									<div
										className={cn(
											"flex-1 cursor-pointer items-center justify-between gap-4 overflow-hidden rounded-lg border px-4 py-2 transition-all duration-300",
											"border-border/40 bg-card hover:border-border/60 hover:bg-accent/60"
										)}
										onClick={() => router.push(`/webhook/endpoints/${endpoint.id}`)}
									>
										<div className="flex-1 min-w-0 flex items-center gap-4">
											<div className="flex items-center gap-3 min-w-0">
												<h3 className="text-sm font-normal text-foreground truncate max-w-[200px] md:max-w-[400px]">
													{endpoint.url}
												</h3>
												{endpoint.description && (
													<>
														<span className="text-muted-foreground/30 text-[10px]">•</span>
														<span className="text-xs text-muted-foreground/50 truncate max-w-[150px] md:max-w-[300px] font-normal">
															{endpoint.description}
														</span>
													</>
												)}
											</div>

											<div className="hidden md:flex items-center gap-4 shrink-0">
												<span className="text-muted-foreground/20 text-[10px]">•</span>
												<div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-normal whitespace-nowrap">
													<Zap className="w-3.5 h-3.5 text-muted-foreground/40" />
													<span>{endpoint.subscribed_events.length} events</span>
												</div>
												{endpoint.rate_limit_config && (
													<>
														<span className="text-muted-foreground/20 text-[10px]">•</span>
														<span className="text-xs text-muted-foreground/40 tabular-nums font-normal whitespace-nowrap">
															{endpoint.rate_limit_config.max_requests} req / {endpoint.rate_limit_config.duration_ms === 1000 ? 'sec' : endpoint.rate_limit_config.duration_ms === 60000 ? 'min' : 'hr'}
														</span>
													</>
												)}
											</div>
										</div>

										<div className="flex items-center justify-end gap-6 shrink-0 font-normal">
											<div className="flex items-center gap-2">
												<div className={cn(
													"w-1 h-1 rounded-full",
													endpoint.is_active ? "bg-green-500" : "bg-muted-foreground/50"
												)} />
												<span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-normal">
													{endpoint.is_active ? "Active" : "Inactive"}
												</span>
											</div>

											<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="sm"
															className="h-7 w-7 p-0 text-muted-foreground/20 hover:text-foreground hover:bg-transparent"
															onClick={(e) => e.stopPropagation()}
														>
															<MoreHorizontal className="w-4 h-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="w-[160px]">
														<DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleEditClick(endpoint)}>
															Edit Configuration
														</DropdownMenuItem>
														<div className="h-px bg-border/50 my-1" />
														<DropdownMenuItem className="text-xs text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer" onClick={() => handleDeleteClick(endpoint)}>
															Delete Endpoint
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
												<ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover/item:text-muted-foreground transition-colors" />
											</div>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</>
	)
}
