"use client"

import { useEffect, useMemo, useState } from "react"
import type { MouseEvent } from "react"
import { useWebhookEvents } from "@wacht/nextjs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Search, Settings2, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { JsonViewer } from "@/components/json-viewer"
import { SchemaViewer } from "@/components/schema-viewer"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import type {
	WebhookEventSubscription,
	WebhookAppEvent,
	EndpointWithSubscriptions,
	CreateEndpointOptions,
	UpdateEndpointOptions,
} from "@wacht/types"

type EndpointConfigPayload = Pick<
	CreateEndpointOptions,
	"url" | "description" | "subscribed_events" | "subscriptions" | "rate_limit_config" | "headers"
> &
	Pick<UpdateEndpointOptions, "is_active">

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	submitLabel: string
	submittingLabel: string
	initial?: EndpointWithSubscriptions | null
	onSubmit: (payload: EndpointConfigPayload) => Promise<void>
	onSubmitted?: () => void
}

export function EndpointConfigDialog({
	open,
	onOpenChange,
	title,
	description,
	submitLabel,
	submittingLabel,
	initial,
	onSubmit,
	onSubmitted,
}: Props) {
	const { events, loading: eventsLoading } = useWebhookEvents()
	const [url, setUrl] = useState("")
	const [descriptionText, setDescriptionText] = useState("")
	const [selectedEvents, setSelectedEvents] = useState<string[]>([])
	const [eventSearch, setEventSearch] = useState("")
	const [advancedOpen, setAdvancedOpen] = useState(false)
	const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
	const [headers, setHeaders] = useState<{ key: string; value: string }[]>([])
	const [eventFilterJson, setEventFilterJson] = useState<Record<string, string>>({})
	const [rateLimitMaxRequests, setRateLimitMaxRequests] = useState<string>("")
	const [rateLimitDurationMs, setRateLimitDurationMs] = useState<string>("1000")
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const eventList = (events || []) as WebhookAppEvent[]

	const initialKey = useMemo(
		() => `${initial?.id || "create"}:${open ? "open" : "closed"}`,
		[initial?.id, open],
	)

	useEffect(() => {
		if (!open) return
		if (initial) {
			setUrl(initial.url)
			setDescriptionText(initial.description || "")
			setSelectedEvents(initial.subscribed_events || [])
			const nextFilters: Record<string, string> = {}
			;(initial.subscriptions || []).forEach((sub) => {
				if (sub.filter_rules && Object.keys(sub.filter_rules).length > 0) {
					nextFilters[sub.event_name] = JSON.stringify(sub.filter_rules, null, 2)
				}
			})
			setEventFilterJson(nextFilters)
			if (initial.rate_limit_config) {
				setRateLimitMaxRequests(initial.rate_limit_config.max_requests.toString())
				setRateLimitDurationMs(initial.rate_limit_config.duration_ms.toString())
				setAdvancedOpen(true)
			} else {
				setRateLimitMaxRequests("")
				setRateLimitDurationMs("1000")
				setAdvancedOpen(false)
			}
			if (initial.headers) {
				setHeaders(Object.entries(initial.headers).map(([key, value]) => ({ key, value: String(value) })))
			} else {
				setHeaders([])
			}
		} else {
			setUrl("")
			setDescriptionText("")
			setSelectedEvents([])
			setRateLimitMaxRequests("")
			setRateLimitDurationMs("1000")
			setHeaders([])
			setEventFilterJson({})
			setAdvancedOpen(false)
		}
		setError(null)
		setExpandedEvents(new Set())
	}, [initialKey, open, initial])

	const handleSubmit = async () => {
		setError(null)
		if (!url) {
			setError("Endpoint URL is required")
			return
		}
		try {
			new URL(url)
		} catch {
			setError("Please enter a valid URL (e.g., https://example.com/webhook)")
			return
		}
		if (selectedEvents.length === 0) {
			setError("Please select at least one event to subscribe to")
			return
		}

		setSubmitting(true)
		try {
			const subscriptions: WebhookEventSubscription[] = selectedEvents.map((eventName) => {
				const raw = (eventFilterJson[eventName] || "").trim()
				if (!raw) return { event_name: eventName }
				let parsed: unknown
				try {
					parsed = JSON.parse(raw)
				} catch {
					throw new Error(`Invalid filter JSON for ${eventName}`)
				}
				if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
					throw new Error(`Filter rules for ${eventName} must be a JSON object`)
				}
				return { event_name: eventName, filter_rules: parsed as Record<string, unknown> }
			})

			const rateLimitConfig = rateLimitMaxRequests && rateLimitDurationMs
				? { max_requests: parseInt(rateLimitMaxRequests, 10), duration_ms: parseInt(rateLimitDurationMs, 10) }
				: undefined

			await onSubmit({
				url,
				description: descriptionText || undefined,
				subscribed_events: selectedEvents,
				subscriptions,
				rate_limit_config: rateLimitConfig,
				headers: headers.length > 0 ? Object.fromEntries(headers.filter((h) => h.key).map((h) => [h.key, h.value])) : undefined,
			})
			onOpenChange(false)
			onSubmitted?.()
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Request failed")
		} finally {
			setSubmitting(false)
		}
	}

	const toggleEvent = (eventName: string) => {
		setSelectedEvents((prev) => (prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName]))
	}

	const toggleEventExpand = (eventName: string, e: MouseEvent) => {
		e.stopPropagation()
		setExpandedEvents((prev) => {
			const next = new Set(prev)
			if (next.has(eventName)) next.delete(eventName)
			else next.add(eventName)
			return next
		})
	}

	const groupedEvents = useMemo(() => {
		return eventList
			.filter((event: WebhookAppEvent) =>
				event.event_name.toLowerCase().includes(eventSearch.toLowerCase()) ||
				event.description?.toLowerCase().includes(eventSearch.toLowerCase()),
			)
			.reduce((acc: Record<string, WebhookAppEvent[]>, event: WebhookAppEvent) => {
				const [group] = event.event_name.split(".")
				if (!acc[group]) acc[group] = []
				acc[group].push(event)
				return acc
			}, {})
	}, [eventList, eventSearch])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[1080px] p-0 bg-popover border border-border/60 shadow-lg rounded-lg overflow-hidden flex flex-col h-[85vh]">
				<DialogHeader className="p-6 pb-0 space-y-1.5">
					<DialogTitle className="text-xl font-normal text-foreground">{title}</DialogTitle>
					<DialogDescription className="text-sm font-normal text-muted-foreground/80">{description}</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-hidden p-6 pt-4">
					<div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
						<div className="md:col-span-4 space-y-6 overflow-y-auto custom-scrollbar pr-2">
							<div className="space-y-2">
								<Label htmlFor="url" className="text-[11px] uppercase font-normal text-muted-foreground">Endpoint URL</Label>
								<Input id="url" placeholder="https://example.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} className="bg-background border-border/50 h-9 font-normal text-sm focus-visible:ring-primary/20" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="description" className="text-[11px] uppercase font-normal text-muted-foreground">Description (optional)</Label>
								<textarea id="description" value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm font-normal ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all" />
							</div>
							<div className="pt-4 border-t border-border/40">
								<button onClick={() => setAdvancedOpen(!advancedOpen)} className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground hover:text-foreground transition-colors group">
									<Settings2 className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
									{advancedOpen ? "Hide Advanced Options" : "Show Advanced Options"}
								</button>
								{advancedOpen ? (
									<div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<Label className="text-[11px] uppercase font-normal text-muted-foreground">Custom Headers</Label>
												<Button type="button" variant="ghost" size="sm" onClick={() => setHeaders((prev) => [...prev, { key: "", value: "" }])} className="h-7 px-2 text-xs font-normal">
													<Plus className="w-3 h-3 mr-1" />
												</Button>
											</div>
											<div className="space-y-2">
												{headers.length === 0 ? <p className="text-xs font-normal text-muted-foreground/50 italic py-1">No custom headers defined.</p> : headers.map((header, index) => (
													<div key={index} className="flex items-center gap-2 group animate-in fade-in slide-in-from-left-1 duration-200">
														<Input placeholder="Key" value={header.key} onChange={(e) => setHeaders((prev) => prev.map((h, i) => (i === index ? { ...h, key: e.target.value } : h)))} className="h-8 text-[11px] font-normal bg-muted/5 border-border/40 focus:ring-primary/10" />
														<Input placeholder="Value" value={header.value} onChange={(e) => setHeaders((prev) => prev.map((h, i) => (i === index ? { ...h, value: e.target.value } : h)))} className="h-8 text-[11px] font-normal bg-muted/5 border-border/40 focus:ring-primary/10" />
														<Button type="button" variant="ghost" size="icon" onClick={() => setHeaders((prev) => prev.filter((_, i) => i !== index))} className="h-8 w-8 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5"><Trash2 className="w-3.5 h-3.5" /></Button>
													</div>
												))}
											</div>
										</div>
										<div className="flex items-center justify-between gap-3 pt-2">
											<div className="grid gap-1 flex-1">
												<Label htmlFor="enable-throttling" className="text-xs font-normal text-foreground cursor-pointer">Rate Limiting</Label>
												<p className="text-xs font-normal text-muted-foreground/70">Prevent overwhelming your destination server.</p>
											</div>
											<Switch id="enable-throttling" checked={!!rateLimitMaxRequests} onCheckedChange={(checked) => { if (!checked) setRateLimitMaxRequests(""); else setRateLimitMaxRequests("100") }} />
										</div>
										{rateLimitMaxRequests ? (
											<div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
												<div className="flex items-center gap-3">
													<div className="flex-1 space-y-1.5">
														<Label className="text-xs font-normal text-muted-foreground/80 uppercase">Max Req</Label>
														<Input type="number" value={rateLimitMaxRequests} onChange={(e) => setRateLimitMaxRequests(e.target.value)} className="h-8 text-xs font-normal bg-background border-border/40" />
													</div>
													<div className="flex-1 space-y-1.5">
														<Label className="text-xs font-normal text-muted-foreground/80 uppercase">Window</Label>
														<Select value={rateLimitDurationMs} onValueChange={setRateLimitDurationMs}>
															<SelectTrigger className="h-8 text-xs font-normal bg-background border-border/40"><SelectValue /></SelectTrigger>
															<SelectContent>
																<SelectItem value="1000" className="text-xs font-normal">Per second</SelectItem>
																<SelectItem value="60000" className="text-xs font-normal">Per minute</SelectItem>
																<SelectItem value="3600000" className="text-xs font-normal">Per hour</SelectItem>
															</SelectContent>
														</Select>
													</div>
												</div>
											</div>
										) : null}
									</div>
								) : null}
							</div>
						</div>

						<div className="md:col-span-8 flex flex-col space-y-4 min-h-0">
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<Label className="text-[11px] uppercase font-normal text-muted-foreground">Event Subscriptions</Label>
									<p className="text-xs font-normal text-muted-foreground/70">Select which events will trigger this webhook.</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-xs font-normal text-muted-foreground/80 italic">{selectedEvents.length === 0 ? "All events selected" : `${selectedEvents.length} selected`}</span>
									{selectedEvents.length > 0 ? <button onClick={() => setSelectedEvents([])} className="text-xs font-normal text-primary hover:text-primary/80 hover:underline transition-colors">Clear</button> : null}
								</div>
							</div>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
								<Input placeholder="Search event types, schemas, descriptions..." value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} className="pl-10 h-10 text-sm font-normal bg-muted/10 border-border/50 focus-visible:ring-primary/20" />
							</div>
							<div className="flex-1 border border-border/50 rounded-xl bg-muted/5 overflow-hidden flex flex-col min-h-0">
								<div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border/30">
									{eventsLoading ? (
										<div className="h-full flex items-center justify-center py-20"><p className="text-xs font-normal text-muted-foreground/50">Loading event catalog...</p></div>
										) : eventList.length === 0 ? (
										<div className="h-full flex items-center justify-center py-20"><p className="text-xs font-normal text-muted-foreground/50">No event types found.</p></div>
									) : Object.entries(groupedEvents).map(([group, groupEvents]) => (
										<div key={group} className="bg-background/20">
											<div className="px-4 py-2 bg-muted/30 border-b border-border/20">
												<span className="text-[11px] uppercase font-normal text-muted-foreground">{group}</span>
											</div>
											<div className="divide-y divide-border/20">
												{groupEvents.map((event) => {
													const isExpanded = expandedEvents.has(event.event_name)
													const isSelected = selectedEvents.includes(event.event_name)
													const schemaProps = event.schema?.properties as Record<string, unknown> | undefined
													return (
														<div key={event.event_name} className={cn("flex flex-col transition-colors", isSelected ? "bg-primary/[0.02]" : "hover:bg-muted/10")}>
															<div className="flex items-start gap-4 px-4 py-3 cursor-pointer group/item" onClick={() => toggleEvent(event.event_name)}>
																<div className="pt-1">
																	<input type="checkbox" checked={isSelected} onChange={() => { }} className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer transition-all" />
																</div>
																<div className="flex-1 min-w-0">
																	<div className="flex items-center justify-between gap-4">
																		<span className="text-xs font-normal text-foreground/90 group-hover/item:text-foreground transition-colors overflow-hidden text-ellipsis whitespace-nowrap">{event.event_name}</span>
																		<button onClick={(e) => toggleEventExpand(event.event_name, e)} className="flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground hover:text-foreground transition-colors py-0.5 px-2 rounded-md hover:bg-muted/30 border border-transparent hover:border-border/50">
																			{isExpanded ? <><span>Collapse</span><ChevronDown className="w-3 h-3" /></> : <><span>Details</span><ChevronRight className="w-3 h-3" /></>}
																		</button>
																	</div>
																	{event.description ? <p className="text-xs font-normal text-muted-foreground/80 mt-1 line-clamp-1 group-hover/item:text-muted-foreground transition-colors">{event.description}</p> : null}
																</div>
															</div>
															{isExpanded ? (
																<div className="px-4 pb-5 pt-1 animate-in slide-in-from-top-1 duration-200">
																	<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 rounded-xl bg-muted/20 border border-border/30">
																		<div className="space-y-3 min-w-0">
																			<div className="flex items-center justify-between border-b border-border/50 pb-2">
																				<h4 className="text-[11px] uppercase font-normal text-muted-foreground/60">Payload Schema</h4>
																				{event.schema ? <Badge variant="outline" className="text-xs h-4 px-1.5 font-normal border-border/40 text-muted-foreground/80">JSON Schema</Badge> : null}
																			</div>
																			<div className="overflow-x-auto custom-scrollbar">
																				{schemaProps ? <SchemaViewer schema={schemaProps} /> : <p className="text-[11px] font-normal text-muted-foreground/40 italic py-2">No schema defined for this event.</p>}
																			</div>
																		</div>
																		<div className="space-y-3 min-w-0">
																			<div className="flex items-center justify-between border-b border-border/50 pb-2">
																				<h4 className="text-[11px] uppercase font-normal text-muted-foreground/60">Example JSON</h4>
																				<button onClick={(e) => { e.stopPropagation(); if (event.example_payload) navigator.clipboard.writeText(JSON.stringify(event.example_payload, null, 2)) }} className="text-xs font-normal text-primary hover:underline">Copy</button>
																			</div>
																			<div className="p-3 bg-card rounded-lg border border-border overflow-hidden">
																				{event.example_payload ? <div className="max-h-[300px] overflow-y-auto custom-scrollbar"><JsonViewer data={event.example_payload} /></div> : <p className="text-[11px] font-normal text-muted-foreground/40 italic py-2">No example payload provided.</p>}
																			</div>
																		</div>
																	</div>
																	{isSelected ? (
																		<div className="mt-3 space-y-2">
																			<Label className="text-[11px] uppercase font-normal text-muted-foreground/70">Filter Rules (JSON, optional)</Label>
																			<textarea value={eventFilterJson[event.event_name] || ""} onChange={(e) => setEventFilterJson((prev) => ({ ...prev, [event.event_name]: e.target.value }))} placeholder='{"user.id":{"$eq":"123"}}' className="min-h-[96px] w-full rounded-md border border-border/50 bg-background/70 px-3 py-2 text-xs font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" />
																			<p className="text-[11px] text-muted-foreground/70 leading-relaxed">Operators: <code>$eq</code>, <code>$ne</code>, <code>$gt</code>, <code>$gte</code>, <code>$lt</code>, <code>$lte</code>, <code>$in</code>, <code>$nin</code>, <code>$contains</code>, <code>$exists</code>. Logic groups: <code>$and</code>, <code>$or</code>.</p>
																			<p className="text-[11px] text-muted-foreground/70 leading-relaxed">Semantics: the rule must evaluate <code>true</code> for delivery to proceed. If it evaluates <code>false</code>, the request is marked <code>filtered</code> and dropped.</p>
																		</div>
																	) : null}
																</div>
															) : null}
														</div>
													)
												})}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter className="p-6 border-t border-border/10 bg-muted/5">
					<div className="flex flex-col sm:flex-row justify-between w-full items-center gap-4">
						<div className="flex-1">
							{error ? (
								<div className="flex items-center gap-2 text-destructive bg-destructive/5 px-3 py-1.5 rounded-md border border-destructive/10">
									<p className="text-[11px] font-normal">{error}</p>
								</div>
							) : null}
						</div>
						<div className="flex items-center gap-3">
							<Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting} className="h-9 px-5 text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50">Cancel</Button>
							<Button onClick={handleSubmit} disabled={!url || submitting} className="h-9 px-6 text-xs font-normal bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-[0.98]">
								{submitting ? submittingLabel : submitLabel}
							</Button>
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
