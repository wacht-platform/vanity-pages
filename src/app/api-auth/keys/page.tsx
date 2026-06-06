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
import { PageState } from "@/components/ui/page-state"
import { Key, Plus, RotateCw, Trash2, Copy, Check } from "lucide-react"

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
	const [secretCopied, setSecretCopied] = useState(false)

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
			const result = await createApiKey({ name: newKeyName.trim(), expires_at: expiresAt })
			setSecretValue(result.data.secret)
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
			const result = await rotateApiKey({ key_id: selectedKeyId })
			setSecretValue(result.data.secret)
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
			<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
				<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div className="space-y-2">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-7 w-40" />
						<Skeleton className="h-3 w-72" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-[130px] rounded-md" />
						<Skeleton className="h-8 w-[110px] rounded-md" />
					</div>
				</div>

				<div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
					{Array.from({ length: 7 }).map((_, idx) => (
						<div key={idx} className="flex items-center gap-3 px-4 py-3">
							<Skeleton className="size-1.5 rounded-full" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-28 rounded-sm" />
							<Skeleton className="hidden h-3 w-24 md:block" />
							<Skeleton className="ml-auto h-[22px] w-16 rounded-sm" />
							<Skeleton className="h-6 w-16 rounded-md" />
							<Skeleton className="h-6 w-16 rounded-md" />
						</div>
					))}
				</div>
			</div>
		)
	}

	if (!hasSession || !apiAuthApp) {
		return (
			<PageState title="Access required" description="You do not have access to this resource." icon={<Key className="h-5 w-5" />} />
		)
	}

	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
			<div className="mb-[22px] flex items-start justify-between gap-6">
				<div className="min-w-0">
					<div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
						Credentials
					</div>
					<h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
						API keys
					</h1>
					<p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
						Active keys can sign requests. Rotate to invalidate the
						secret without dropping the key id.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Select value={status} onValueChange={(value) => setStatus(value as KeyStatus)}>
						<SelectTrigger className="h-[30px] w-[120px] text-[12px]">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="revoked">Revoked</SelectItem>
							<SelectItem value="all">All</SelectItem>
						</SelectContent>
					</Select>
					<Button size="sm" className="h-[30px]" onClick={() => setCreateOpen(true)}>
						<Plus className="mr-1.5 h-3.5 w-3.5" />
						Create key
					</Button>
				</div>
			</div>

			{keys.length === 0 ? (
				<div className="rounded-lg border border-dashed border-border bg-secondary/30 py-14 text-center">
					<p className="text-sm text-muted-foreground">No keys found</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<div className="min-w-[860px] divide-y divide-border">
						{keys.map((key: ApiKey) => {
							const lastUsed = (key as { last_used_at?: string | null })
								.last_used_at
							return (
								<div
									key={key.id}
									className="grid grid-cols-[8px_1.6fr_150px_130px_1fr_96px_100px_90px] items-center gap-[14px] px-[18px] py-[14px] transition-colors hover:bg-accent/50"
								>
									<span
										className={cn(
											"size-1.5 rounded-full",
											key.is_active
												? "bg-emerald-500"
												: "bg-muted-foreground/40",
										)}
									/>
									<span className="truncate text-[13px] font-medium text-foreground">
										{key.name}
									</span>
									<code className="inline-flex w-fit items-center whitespace-nowrap rounded-[3px] border border-border bg-foreground/[0.05] px-1.5 py-px font-mono text-[11px] font-medium leading-[1.4] text-foreground">
										{key.key_prefix}…{key.key_suffix}
									</code>
									<span className="font-mono text-[11px] leading-none text-muted-foreground">
										{format(new Date(key.created_at), "MMM d, yyyy")}
									</span>
									<span className="truncate font-mono text-[11px] leading-none text-muted-foreground">
										{lastUsed
											? `last used ${format(new Date(lastUsed), "MMM d")}`
											: "—"}
									</span>
									<span
										className={cn(
											"inline-flex h-[22px] w-fit items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[11px] font-medium lowercase",
											key.is_active
												? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
												: "border-border bg-muted text-muted-foreground",
										)}
									>
										<span
											className={cn(
												"size-1.5 rounded-full",
												key.is_active
													? "bg-emerald-500"
													: "bg-muted-foreground/40",
											)}
										/>
										{key.is_active ? "active" : "revoked"}
									</span>
									<div className="flex justify-end">
										<Button
											variant="outline"
											size="sm"
											className="h-[30px] gap-1.5 px-2 text-[12px] font-medium"
											onClick={() => openKeyAction(key.id, key.name, "rotate")}
											disabled={!key.is_active || rotatingKeyId !== null}
										>
											<RotateCw className="h-3.5 w-3.5" />
											Rotate
										</Button>
									</div>
									<div className="flex justify-end">
										<Button
											variant="ghost"
											size="sm"
											className="h-[30px] gap-1.5 px-2 text-[12px] font-medium text-destructive hover:text-destructive"
											onClick={() => openKeyAction(key.id, key.name, "revoke")}
											disabled={!key.is_active || isRevoking}
										>
											<Trash2 className="h-3.5 w-3.5" />
											Delete
										</Button>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}

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

			<Dialog
				open={secretOpen}
				onOpenChange={(open) => {
					setSecretOpen(open)
					if (!open) setSecretCopied(false)
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>API key created</DialogTitle>
						<DialogDescription>
							Copy your secret now — it won&apos;t be shown again.
						</DialogDescription>
					</DialogHeader>

					<div className="flex items-center gap-2">
						<code className="min-w-0 flex-1 truncate rounded-[6px] border border-border bg-foreground/[0.04] px-3 py-2 font-mono text-[12px] text-foreground">
							{secretValue}
						</code>
						<Button
							variant="outline"
							size="icon-sm"
							className="shrink-0"
							onClick={() => {
								navigator.clipboard.writeText(secretValue)
								setSecretCopied(true)
								toast.success("Copied to clipboard")
								setTimeout(() => setSecretCopied(false), 2000)
							}}
							aria-label="Copy secret"
						>
							{secretCopied ? (
								<Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
							) : (
								<Copy className="h-3.5 w-3.5" />
							)}
						</Button>
					</div>

					<DialogFooter>
						<Button size="sm" onClick={() => setSecretOpen(false)}>
							Done
						</Button>
					</DialogFooter>
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
