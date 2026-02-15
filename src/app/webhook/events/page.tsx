"use client"

import { useWebhookEvents } from "@wacht/nextjs"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { JsonViewer } from "@/components/json-viewer"
import { SchemaViewer } from "@/components/schema-viewer"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { WebhookAppEvent } from "@wacht/types"

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

    if (loading) {
        return (
            <div className="w-full px-4 py-2 md:px-6 md:py-3 space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div className="h-8 w-48 bg-muted/20 animate-pulse rounded-md" />
                    <div className="h-10 w-full md:w-80 bg-muted/10 animate-pulse rounded-lg border border-border/50" />
                </div>
                <div className="space-y-8">
                    {[1, 2].map(group => (
                        <div key={group} className="relative">
                            <div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-muted/10 -z-10" />
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-4 h-4 rounded-full border-2 border-muted/20 bg-background z-10" />
                                <div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
                                <div className="h-px flex-1 bg-muted/10" />
                            </div>
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full px-4 py-2 md:px-6 md:py-3 mx-auto">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-lg font-normal text-foreground">Event Catalog</h1>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/50 transition-colors" />
                    <Input
                        placeholder="Search event names, categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-8 bg-muted/10 border-border/50 focus-visible:ring-primary/20 transition-all rounded-lg text-xs font-normal"
                    />
                </div>
            </div>

            {groupedEvents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl bg-muted/5">
                    <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-normal text-muted-foreground">No events found matching your search</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {groupedEvents.map(([groupName, groupEvents]) => (
                        <div key={groupName} className="relative group/group">
                            {/* Vertical Rail for the group */}
                            <div className="absolute left-[7px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10 group-last/group:h-0" />

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-background z-10" />
                                <h2 className="text-xs font-normal uppercase text-foreground/70">
                                    {groupName}
                                </h2>
                                <div className="h-px flex-1 bg-gradient-to-r from-border/30 to-transparent" />
                                <Badge variant="secondary" className="bg-muted/30 text-muted-foreground font-normal border-none text-xs">
                                    {groupEvents.length} {groupEvents.length === 1 ? 'Event' : 'Events'}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                {groupEvents.map((event: WebhookAppEvent) => {
                                    const isExpanded = expandedEvents.has(event.event_name)
                                    const schemaProps = event.schema?.properties as Record<string, any> | undefined

                                    return (
                                        <div
                                            key={event.event_name}
                                            className={cn(
                                                "group/item transition-all duration-300",
                                                isExpanded ? "scale-[1.005]" : ""
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "relative border transition-all duration-300 rounded-xl overflow-hidden",
                                                    isExpanded
                                                        ? "border-primary/20 bg-primary/[0.01]"
                                                        : "border-border/30 bg-background hover:border-primary/10"
                                                )}
                                            >
                                                <button
                                                    onClick={() => toggleEventExpand(event.event_name)}
                                                    className="w-full text-left px-4 py-2 flex items-center gap-3"
                                                >
                                                    <div className="flex-1 min-w-0 flex items-center gap-3">
                                                        <span className="text-sm font-normal text-foreground">
                                                            {event.event_name}
                                                        </span>
                                                        {event.schema && (
                                                            <Badge variant="secondary" className="text-xs h-4 px-1.5 font-normal bg-muted text-muted-foreground border-none">
                                                                SCHEMA
                                                            </Badge>
                                                        )}
                                                        {event.description && (
                                                            <>
                                                                <span className="text-muted-foreground/30 text-xs">|</span>
                                                                <span className="text-xs font-normal text-muted-foreground truncate max-w-[400px]">
                                                                    {event.description}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "p-1 rounded-lg transition-colors",
                                                        isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground/50 group-hover/item:text-muted-foreground"
                                                    )}>
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="border-t border-border/10">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x border-border/5">
                                                            {/* Schema Column */}
                                                            <div className="py-6 px-4">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-xs uppercase font-normal text-muted-foreground/80">Properties</h4>
                                                                    <Badge variant="outline" className="text-xs font-normal border-border/40 opacity-50">JSON Schema</Badge>
                                                                </div>
                                                                <div className="min-h-[100px]">
                                                                    {schemaProps && Object.keys(schemaProps).length > 0 ? (
                                                                        <div className="overflow-x-auto text-sm font-normal">
                                                                            <SchemaViewer schema={schemaProps} />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="py-8 text-center">
                                                                            <p className="text-xs text-muted-foreground/30 italic font-normal">No schema properties defined</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Example Column */}
                                                            <div className="py-6 px-4 bg-muted/5">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <h4 className="text-xs uppercase font-normal text-muted-foreground/80">Payload Example</h4>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (event.example_payload) {
                                                                                navigator.clipboard.writeText(JSON.stringify(event.example_payload, null, 2));
                                                                            }
                                                                        }}
                                                                        className="text-xs font-normal text-primary/50 hover:text-primary hover:underline transition-colors"
                                                                    >
                                                                        Copy JSON
                                                                    </button>
                                                                </div>
                                                                <div className="">
                                                                    {event.example_payload ? (
                                                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar font-normal">
                                                                            <JsonViewer data={event.example_payload} />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="py-8 text-center">
                                                                            <p className="text-xs text-muted-foreground/20 italic font-normal">No example payload provided</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
