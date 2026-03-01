"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useApiAuth } from "@/components/api-auth-provider"
import { useApiAuthKeys } from "@wacht/nextjs"
import type { ApiKey } from "@wacht/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

type KeyStatus = "active" | "revoked" | "all"

export default function ApiAuthKeysPage() {
	const { apiAuthApp, loading, hasSession } = useApiAuth()
	const [status, setStatus] = useState<KeyStatus>("active")

	const [createOpen, setCreateOpen] = useState(false)
	const [secretOpen, setSecretOpen] = useState(false)
	const [revokeOpen, setRevokeOpen] = useState(false)
	const [rotateOpen, setRotateOpen] = useState(false)

	const [newKeyName, setNewKeyName] = useState("")
	const [newKeyExpiresAt, setNewKeyExpiresAt] = useState("")
	const [revokeReason, setRevokeReason] = useState("")
	const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
	const [selectedKeyName, setSelectedKeyName] = useState<string | null>(null)
	const [secretValue, setSecretValue] = useState("")

	const [isCreating, setIsCreating] = useState(false)
	const [isRevoking, setIsRevoking] = useState(false)
	const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null)

	const {
		keys,
		loading: keysLoading,
		createKey: createApiKey,
		rotateKey: rotateApiKey,
		revokeKey: revokeApiKey,
	} = useApiAuthKeys({ status })

	const openKeyAction = (keyId: string, keyName: string, action: "rotate" | "revoke") => {
		setSelectedKeyId(keyId)
		setSelectedKeyName(keyName)
		if (action === "rotate") {
			setRotateOpen(true)
			return
		}
		setRevokeOpen(true)
	}

	const handleCreateKey = async () => {
		if (!newKeyName.trim() || isCreating) return
		setIsCreating(true)
		try {
			const expiresAt = newKeyExpiresAt ? new Date(newKeyExpiresAt).toISOString() : undefined
			const keyData = await createApiKey({ name: newKeyName.trim(), expires_at: expiresAt })
			setSecretValue(keyData.secret)
			setCreateOpen(false)
			setSecretOpen(true)
			setNewKeyName("")
			setNewKeyExpiresAt("")
			toast.success("API key created")
		} catch (error) {
			console.error("Failed to create API key:", error)
			toast.error("Create failed", { description: "Could not create API key." })
		} finally {
			setIsCreating(false)
		}
	}

	const handleRotateKey = async () => {
		if (!selectedKeyId || rotatingKeyId !== null) return
		setRotatingKeyId(selectedKeyId)
		try {
			const keyData = await rotateApiKey({ key_id: selectedKeyId })
			setSecretValue(keyData.secret)
			setRotateOpen(false)
			setSecretOpen(true)
			toast.success("API key rotated")
		} catch (error) {
			console.error("Failed to rotate API key:", error)
			toast.error("Rotate failed", { description: "Could not rotate API key." })
		} finally {
			setRotatingKeyId(null)
			setSelectedKeyId(null)
			setSelectedKeyName(null)
		}
	}

	const handleRevokeKey = async () => {
		if (!selectedKeyId || isRevoking) return
		setIsRevoking(true)
		try {
			await revokeApiKey({
				key_id: selectedKeyId,
				reason: revokeReason.trim() || undefined,
			})
			setRevokeOpen(false)
			setRevokeReason("")
			setSelectedKeyId(null)
			setSelectedKeyName(null)
			toast.success("API key revoked")
		} catch (error) {
			console.error("Failed to revoke API key:", error)
			toast.error("Revoke failed", { description: "Could not revoke API key." })
		} finally {
			setIsRevoking(false)
		}
	}

	if (loading || keysLoading) {
		return (
			<div className="w-full px-4 py-2 md:px-6 md:py-3">
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
					<Skeleton className="h-6 w-20" />
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-[160px] rounded-md" />
						<Skeleton className="h-9 w-[96px] rounded-md" />
					</div>
				</div>

				<div className="relative">
					<div className="absolute left-[7px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10" />
					<div className="space-y-2">
						{Array.from({ length: 7 }).map((_, idx) => (
							<div
								key={idx}
								className="flex items-center justify-between gap-4 px-4 py-2 border border-border/30 rounded-xl bg-background"
							>
								<div className="flex-1 min-w-0 flex items-center gap-4">
									<div className="flex items-center gap-3 min-w-0">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-4 w-28 rounded-sm" />
									</div>
									<div className="hidden md:flex items-center gap-4 shrink-0">
										<Skeleton className="h-3 w-32" />
									</div>
								</div>
								<div className="flex items-center gap-6 shrink-0">
									<Skeleton className="h-3 w-14" />
									<div className="hidden sm:flex items-center gap-1.5">
										<Skeleton className="h-6 w-12 rounded-md" />
										<Skeleton className="h-6 w-12 rounded-md" />
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	if (!hasSession || !apiAuthApp) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-medium mb-2 text-foreground">Access Required</h2>
					<p className="text-muted-foreground">You dont have access to this resource.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full px-4 py-2 md:px-6 md:py-3">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
				<h1 className="text-lg font-normal text-foreground">API Keys</h1>
				<div className="flex items-center gap-3">
					<Select value={status} onValueChange={(value) => setStatus(value as KeyStatus)}>
						<SelectTrigger className="w-[160px]">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="revoked">Revoked</SelectItem>
							<SelectItem value="all">All</SelectItem>
						</SelectContent>
					</Select>
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						Create Key
					</Button>
				</div>
			</div>

			<div className="relative">
				{keys.length > 0 ? (
					<div className="absolute left-[7px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10" />
				) : null}

				<div className="space-y-2">
					{keys.length === 0 ? (
						<div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-muted/5">
							<p className="text-sm font-normal text-muted-foreground">No keys found</p>
						</div>
					) : (
						keys.map((key: ApiKey) => (
							<div key={key.id} className="group/item">
								<div
									className={cn(
										"flex-1 flex items-center justify-between gap-4 px-4 py-2 border transition-all duration-300 rounded-xl overflow-hidden",
										"border-border/30 bg-background hover:border-sidebar-accent hover:bg-muted/5",
									)}
								>
									<div className="flex-1 min-w-0 flex items-center gap-4">
										<div className="flex items-center gap-3 min-w-0">
											<span className="text-sm font-normal text-foreground truncate max-w-[200px] md:max-w-[400px]">
												{key.name}
											</span>
											<code className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 text-[10px] text-muted-foreground font-mono">
												{key.key_prefix}...{key.key_suffix}
											</code>
										</div>

										<div className="hidden md:flex items-center gap-4 shrink-0">
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 font-normal whitespace-nowrap">
												<span>Created {format(new Date(key.created_at), "MMM d, yyyy")}</span>
											</div>
										</div>
									</div>

									<div className="flex items-center justify-end gap-6 shrink-0 font-normal">
										<div className="flex items-center gap-2">
											<div
												className={cn(
													"w-1 h-1 rounded-full",
													key.is_active ? "bg-emerald-500" : "bg-muted-foreground/50",
												)}
											/>
											<span
												className={cn(
													"text-[10px] uppercase tracking-wider",
													key.is_active
														? "text-emerald-600/70"
														: "text-muted-foreground/50",
												)}
											>
												{key.is_active ? "Active" : "Revoked"}
											</span>
										</div>

										<div className="flex items-center gap-1.5">
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-muted-foreground/30 hover:text-foreground hover:bg-transparent px-2"
												onClick={() => openKeyAction(key.id, key.name, "rotate")}
												disabled={!key.is_active || rotatingKeyId !== null}
											>
												Rotate
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-muted-foreground/30 hover:text-red-500 hover:bg-transparent px-2"
												onClick={() => openKeyAction(key.id, key.name, "revoke")}
												disabled={!key.is_active || isRevoking}
											>
												Delete
											</Button>
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg font-normal">Create API Key</DialogTitle>
						<DialogDescription className="text-xs">
							Generate a new API key for this app.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<span className="text-xs font-medium text-foreground">Name</span>
							<Input
								placeholder="e.g. Production Backend"
								value={newKeyName}
								onChange={(event) => setNewKeyName(event.target.value)}
								className="h-9 text-xs"
							/>
						</div>
						<div className="grid gap-2">
							<span className="text-xs font-medium text-foreground">Expires At (Optional)</span>
							<Input
								type="datetime-local"
								value={newKeyExpiresAt}
								onChange={(event) => setNewKeyExpiresAt(event.target.value)}
								className="h-9 text-xs"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setCreateOpen(false)}
							className="h-9 text-xs"
							disabled={isCreating}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateKey}
							disabled={!newKeyName.trim() || isCreating}
							size="sm"
							className="h-9 text-xs"
						>
							{isCreating ? "Creating..." : "Create Key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={secretOpen} onOpenChange={setSecretOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg font-normal">API Key Created</DialogTitle>
						<DialogDescription className="text-xs">
							Copy this key now. It will not be shown again.
						</DialogDescription>
					</DialogHeader>
					<div className="flex items-center gap-2 mt-2">
						<code className="flex-1 text-xs text-foreground bg-muted px-3 py-2 rounded border border-border/50 font-mono break-all">
							{secretValue}
						</code>
						<Button
							variant="ghost"
							size="sm"
							className="h-9 shrink-0 px-3"
							onClick={() => {
								navigator.clipboard.writeText(secretValue)
								toast.success("Copied")
							}}
						>
							Copy
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg font-normal">Rotate API Key</DialogTitle>
						<DialogDescription className="text-xs">
							Are you sure you want to rotate{" "}
							<span className="font-medium text-foreground">{selectedKeyName}</span>?
							<br />
							The old key will be revoked immediately.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setRotateOpen(false)}
							className="h-9 text-xs"
							disabled={rotatingKeyId !== null}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRotateKey}
							disabled={rotatingKeyId !== null || !selectedKeyId}
							size="sm"
							className="h-9 text-xs"
						>
							{rotatingKeyId ? "Rotating..." : "Rotate Key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg font-normal">Revoke API Key</DialogTitle>
						<DialogDescription className="text-xs">
							Are you sure you want to revoke{" "}
							<span className="font-medium text-foreground">{selectedKeyName}</span>?
							<br />
							This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						<Textarea
							placeholder="Reason for revocation (optional)"
							value={revokeReason}
							onChange={(event) => setRevokeReason(event.target.value)}
							className="text-xs resize-none"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setRevokeOpen(false)}
							className="h-9 text-xs"
							disabled={isRevoking}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleRevokeKey}
							className="h-9 text-xs"
							disabled={isRevoking}
						>
							{isRevoking ? "Revoking..." : "Revoke Key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
