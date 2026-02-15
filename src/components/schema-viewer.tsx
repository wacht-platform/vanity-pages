"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SchemaViewerProps {
    schema: Record<string, any>
}

export function SchemaViewer({ schema }: SchemaViewerProps) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    const toggleCollapse = (path: string) => {
        const newCollapsed = new Set(collapsed)
        if (newCollapsed.has(path)) {
            newCollapsed.delete(path)
        } else {
            newCollapsed.add(path)
        }
        setCollapsed(newCollapsed)
    }

    return (
        <div className="space-y-3">
            {Object.entries(schema).map(([fieldName, fieldDef]) => {
                const fieldType = fieldDef.type
                const isComplex = fieldType === 'object' || fieldType === 'array'
                const isCollapsed = collapsed.has(fieldName)

                return (
                    <div key={fieldName} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">
                                {fieldName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                                {fieldType || 'any'}
                            </Badge>
                            {isComplex && (
                                <button
                                    onClick={() => toggleCollapse(fieldName)}
                                    className="hover:bg-muted/50 rounded p-0.5 transition-colors"
                                >
                                    {isCollapsed ? (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                                    ) : (
                                        <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                                    )}
                                </button>
                            )}
                        </div>

                        {fieldDef.description && (
                            <p className="text-xs text-muted-foreground ml-5">
                                {fieldDef.description}
                            </p>
                        )}

                        {/* Show expanded content for complex types */}
                        {isComplex && !isCollapsed && (
                            <div className="mt-2 ml-5 border-l-2 border-primary/20 pl-3 space-y-2">
                                {fieldType === 'object' && fieldDef.properties ? (
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-2 uppercase">Properties</div>
                                        <SchemaViewer schema={fieldDef.properties} />
                                    </div>
                                ) : fieldType === 'object' ? (
                                    <div className="text-xs text-muted-foreground italic">
                                        Object (no properties defined)
                                    </div>
                                ) : null}

                                {fieldType === 'array' && fieldDef.items ? (
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-2 uppercase">Items</div>
                                        {fieldDef.items.type === 'object' && fieldDef.items.properties ? (
                                            <SchemaViewer schema={fieldDef.items.properties} />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {fieldDef.items.type || 'any'}
                                                </Badge>
                                                {fieldDef.items.description && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {fieldDef.items.description}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : fieldType === 'array' ? (
                                    <div className="text-xs text-muted-foreground italic">
                                        Array (no items schema defined)
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
