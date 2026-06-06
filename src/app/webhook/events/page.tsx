"use client"

import { useWebhookEvents } from "@wacht/nextjs"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { JsonViewer } from "@/components/json-viewer"
import { SchemaViewer } from "@/components/schema-viewer"
import { useState, useMemo } from "react"
import type { WebhookAppEvent } from "@wacht/types"

const LBL = "font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground"

export default function WebhookEventsPage() {
    const { events, loading } = useWebhookEvents()
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

    const filteredEvents = useMemo(() => {
        if (!events) return []
        return events.filter((event: WebhookAppEvent) =>
            !event.is_archived && (
                event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (event.group || "").toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
    }, [events, searchQuery])

    const groupedEvents = useMemo(() => {
        const groups: Record<string, WebhookAppEvent[]> = {}
        filteredEvents.forEach((event: WebhookAppEvent) => {
            const groupName = event.group || event.event_name.split('.')[0] || "General"
            if (!groups[groupName]) groups[groupName] = []
            groups[groupName].push(event)
        })
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    }, [filteredEvents])

    const toggleEventExpand = (eventName: string) => {
        const newExpanded = new Set(expandedEvents)
        if (newExpanded.has(eventName)) {
            newExpanded.delete(eventName)
        } else {
            newExpanded.add(eventName)
        }
        setExpandedEvents(newExpanded)
    }

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0">
                    <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                        Webhooks
                    </div>
                    <h1 className="mb-1.5 text-[22px] font-medium leading-[1.2] tracking-[-0.012em] text-foreground">
                        Event catalog
                    </h1>
                    <p className="max-w-xl text-[13px] leading-[1.5] text-muted-foreground">
                        Every event you can subscribe an endpoint to.
                    </p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                        placeholder="Search events…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-[30px] pl-9 text-[12px]"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-8">
                    {[0, 1].map((g) => (
                        <div key={g}>
                            <div className="mb-2.5 flex items-center gap-3">
                                <span className="h-3 w-28 animate-pulse rounded bg-muted" />
                                <span className="h-px flex-1 bg-border" />
                            </div>
                            <div className="overflow-hidden rounded-[10px] border border-border bg-card">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="flex items-center gap-3 border-b border-border px-[18px] py-3 last:border-0">
                                        <span className="h-3 w-40 animate-pulse rounded bg-muted" />
                                        <span className="h-3 flex-1 animate-pulse rounded bg-muted" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : groupedEvents.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-border bg-muted/30 py-14 text-center">
                    <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-muted-foreground">
                        <Search className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-muted-foreground">No events found matching your search</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedEvents.map(([groupName, groupEvents]) => (
                        <div key={groupName}>
                            <div className="mb-2.5 flex items-center gap-3">
                                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                    {groupName}
                                </span>
                                <span className="h-px flex-1 bg-border" />
                                <span className="font-mono text-[11px] text-muted-foreground/70">
                                    {groupEvents.length} {groupEvents.length === 1 ? "event" : "events"}
                                </span>
                            </div>

                            <div className="divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-card">
                                {groupEvents.map((event: WebhookAppEvent) => {
                                    const isExpanded = expandedEvents.has(event.event_name)
                                    const schemaProps = event.schema?.properties as Record<string, unknown> | undefined

                                    return (
                                        <div key={event.event_name}>
                                            <button
                                                onClick={() => toggleEventExpand(event.event_name)}
                                                className="flex w-full items-center gap-3 px-[18px] py-3 text-left transition-colors hover:bg-accent/40"
                                            >
                                                <span className="shrink-0 font-mono text-[12px] text-foreground/80">
                                                    {event.event_name}
                                                </span>
                                                {event.schema && (
                                                    <span className="inline-flex h-[18px] shrink-0 items-center rounded-[4px] bg-primary/10 px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-primary">
                                                        Schema
                                                    </span>
                                                )}
                                                {event.description && (
                                                    <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
                                                        {event.description}
                                                    </span>
                                                )}
                                                <span className="ml-auto shrink-0 text-muted-foreground/50">
                                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div className="grid grid-cols-1 divide-y divide-border border-t border-border bg-secondary/30 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                                                    <div className="px-[18px] py-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <span className={LBL}>Properties</span>
                                                            <span className="font-mono text-[10px] text-muted-foreground/60">JSON Schema</span>
                                                        </div>
                                                        {schemaProps && Object.keys(schemaProps).length > 0 ? (
                                                            <div className="overflow-x-auto text-[13px]">
                                                                <SchemaViewer schema={schemaProps} />
                                                            </div>
                                                        ) : (
                                                            <p className="py-6 text-center text-[12px] italic text-muted-foreground/60">No schema properties defined</p>
                                                        )}
                                                    </div>

                                                    <div className="px-[18px] py-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <span className={LBL}>Payload example</span>
                                                            {event.example_payload && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        navigator.clipboard.writeText(JSON.stringify(event.example_payload, null, 2))
                                                                    }}
                                                                    className="font-mono text-[10px] uppercase tracking-[0.06em] text-primary transition-colors hover:underline"
                                                                >
                                                                    Copy JSON
                                                                </button>
                                                            )}
                                                        </div>
                                                        {event.example_payload ? (
                                                            <div className="custom-scrollbar max-h-[400px] overflow-y-auto">
                                                                <JsonViewer data={event.example_payload} />
                                                            </div>
                                                        ) : (
                                                            <p className="py-6 text-center text-[12px] italic text-muted-foreground/60">No example payload provided</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
