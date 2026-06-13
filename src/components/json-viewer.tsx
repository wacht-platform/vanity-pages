"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

interface JsonViewerProps {
    data: any
}

// Design `.json` syntax palette (Wacht SDK surfaces).
const C = {
    key: "text-primary",
    str: "text-success",
    num: "text-warning",
    bool: "text-info",
    null: "italic text-faint",
    punct: "text-muted-foreground/70",
}

export function JsonViewer({ data }: JsonViewerProps) {
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

    const renderValue = (value: any, path: string) => {
        if (value === null) {
            return <span className={C.null}>null</span>
        }

        if (typeof value === "boolean") {
            return <span className={C.bool}>{value.toString()}</span>
        }

        if (typeof value === "number") {
            return <span className={C.num}>{value}</span>
        }

        if (typeof value === "string") {
            return <span className={C.str}>&quot;{value}&quot;</span>
        }

        if (Array.isArray(value)) {
            const isCollapsed = collapsed.has(path)
            return (
                <div>
                    <button
                        onClick={() => toggleCollapse(path)}
                        className="-ml-1 inline-flex items-center gap-1 rounded px-1 transition-colors hover:bg-muted/50"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                        ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                        )}
                        <span className={C.punct}>[{value.length}]</span>
                    </button>
                    {!isCollapsed && (
                        <div className="ml-2 pl-3">
                            {value.map((item, index) => (
                                <div key={index}>
                                    {renderValue(item, `${path}.${index}`)}
                                    {index < value.length - 1 && <span className={C.punct}>,</span>}
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
                        className="-ml-1 inline-flex items-center gap-1 rounded px-1 transition-colors hover:bg-muted/50"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                        ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                        )}
                        <span className={C.punct}>{`{${keys.length}}`}</span>
                    </button>
                    {!isCollapsed && (
                        <div className="ml-2 pl-3">
                            {keys.map((objKey, index) => (
                                <div key={objKey}>
                                    <span className={C.key}>&quot;{objKey}&quot;</span>
                                    <span className={C.punct}>: </span>
                                    {renderValue(value[objKey], `${path}.${objKey}`)}
                                    {index < keys.length - 1 && <span className={C.punct}>,</span>}
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
        <div className="min-w-0 whitespace-pre-wrap break-all font-mono text-[12px] leading-[1.55]">
            {typeof data === "object" && data !== null ? (
                Array.isArray(data) ? (
                    <div>
                        <span className={C.punct}>[</span>
                        <div className="ml-2 pl-3">
                            {data.map((item, index) => (
                                <div key={index}>
                                    {renderValue(item, index.toString())}
                                    {index < data.length - 1 && <span className={C.punct}>,</span>}
                                </div>
                            ))}
                        </div>
                        <span className={C.punct}>]</span>
                    </div>
                ) : (
                    <div>
                        <span className={C.punct}>{"{"}</span>
                        <div className="ml-2 pl-3">
                            {Object.entries(data).map(([key, value], index, arr) => (
                                <div key={key}>
                                    <span className={C.key}>&quot;{key}&quot;</span>
                                    <span className={C.punct}>: </span>
                                    {renderValue(value, key)}
                                    {index < arr.length - 1 && <span className={C.punct}>,</span>}
                                </div>
                            ))}
                        </div>
                        <span className={C.punct}>{"}"}</span>
                    </div>
                )
            ) : (
                renderValue(data, "")
            )}
        </div>
    )
}
