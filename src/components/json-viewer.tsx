"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

interface JsonViewerProps {
    data: any
    level?: number
}

export function JsonViewer({ data, level = 0 }: JsonViewerProps) {
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

    const renderValue = (value: any, key: string, path: string) => {
        const indent = level * 16

        if (value === null) {
            return <span className="text-purple-600 dark:text-purple-400">null</span>
        }

        if (typeof value === "boolean") {
            return <span className="text-purple-600 dark:text-purple-400">{value.toString()}</span>
        }

        if (typeof value === "number") {
            return <span className="text-green-600 dark:text-green-400">{value}</span>
        }

        if (typeof value === "string") {
            return <span className="text-orange-600 dark:text-yellow-400">"{value}"</span>
        }

        if (Array.isArray(value)) {
            const isCollapsed = collapsed.has(path)
            return (
                <div>
                    <button
                        onClick={() => toggleCollapse(path)}
                        className="inline-flex items-center gap-1 hover:bg-muted/50 dark:hover:bg-white/5 rounded px-1 -ml-1 transition-colors"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                        ) : (
                            <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                        )}
                        <span className="text-muted-foreground/60">[{value.length}]</span>
                    </button>
                    {!isCollapsed && (
                        <div className="ml-4 border-l border-border/20 dark:border-white/10 pl-3 mt-1">
                            {value.map((item, index) => (
                                <div key={index} className="mb-1">
                                    <span className="text-blue-600 dark:text-blue-400">{index}</span>
                                    <span className="text-muted-foreground/40">: </span>
                                    {renderValue(item, index.toString(), `${path}.${index}`)}
                                    {index < value.length - 1 && <span className="text-muted-foreground/40">,</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        if (typeof value === "object") {
            const isCollapsed = collapsed.has(path)
            const keys = Object.keys(value)
            return (
                <div>
                    <button
                        onClick={() => toggleCollapse(path)}
                        className="inline-flex items-center gap-1 hover:bg-muted/50 dark:hover:bg-white/5 rounded px-1 -ml-1 transition-colors"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                        ) : (
                            <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                        )}
                        <span className="text-muted-foreground/60">{`{${keys.length}}`}</span>
                    </button>
                    {!isCollapsed && (
                        <div className="ml-4 border-l border-border/20 dark:border-white/10 pl-3 mt-1">
                            {keys.map((objKey, index) => (
                                <div key={objKey} className="mb-1">
                                    <span className="text-blue-600 dark:text-blue-400">"{objKey}"</span>
                                    <span className="text-muted-foreground/40">: </span>
                                    {renderValue(value[objKey], objKey, `${path}.${objKey}`)}
                                    {index < keys.length - 1 && <span className="text-muted-foreground/40">,</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        return <span className="text-foreground/80">{String(value)}</span>
    }

    return (
        <div className="text-xs font-mono leading-relaxed min-w-0 break-all whitespace-pre-wrap">
            {typeof data === "object" && data !== null ? (
                Array.isArray(data) ? (
                    <div>
                        <span className="text-muted-foreground/40">[</span>
                        <div className="ml-4 border-l border-border/20 dark:border-white/10 pl-3">
                            {data.map((item, index) => (
                                <div key={index} className="my-1">
                                    {renderValue(item, index.toString(), index.toString())}
                                    {index < data.length - 1 && <span className="text-muted-foreground/40">,</span>}
                                </div>
                            ))}
                        </div>
                        <span className="text-muted-foreground/40">]</span>
                    </div>
                ) : (
                    <div>
                        <span className="text-muted-foreground/40">{"{"}</span>
                        <div className="ml-4 border-l border-border/20 dark:border-white/10 pl-3">
                            {Object.entries(data).map(([key, value], index, arr) => (
                                <div key={key} className="my-1">
                                    <span className="text-blue-600 dark:text-blue-400">"{key}"</span>
                                    <span className="text-muted-foreground/40">: </span>
                                    {renderValue(value, key, key)}
                                    {index < arr.length - 1 && <span className="text-muted-foreground/40">,</span>}
                                </div>
                            ))}
                        </div>
                        <span className="text-muted-foreground/40">{"}"}</span>
                    </div>
                )
            ) : (
                renderValue(data, "", "")
            )}
        </div>
    )
}
