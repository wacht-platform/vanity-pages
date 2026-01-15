"use client"

import { ArrowUp, Plus } from "lucide-react"
import React from "react";
import { cn } from "@/lib/utils";

// Local type for UI display
export type FileData = {
    filename: string;
    mime_type: string;
    file: File;
};

interface ChatInputProps {
    placeholder?: string;
    className?: string;
    onSend?: (message: string, files?: File[]) => void;
}

export function ChatInput({ placeholder = "How can I help you today?", className, onSend }: ChatInputProps) {
    const [message, setMessage] = React.useState("");
    const [selectedFiles, setSelectedFiles] = React.useState<FileData[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        const trimmedMessage = message.trim();
        if ((trimmedMessage || selectedFiles.length > 0) && onSend) {
            onSend(trimmedMessage, selectedFiles.map(f => f.file));
            setMessage("");
            setSelectedFiles([]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newFiles: FileData[] = files.map(file => ({
                filename: file.name,
                mime_type: file.type || "application/octet-stream",
                file: file
            }));

            setSelectedFiles(prev => [...prev, ...newFiles]);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className={cn("relative bg-[#3a3a3a] rounded-[16px] overflow-hidden group shadow-sm ring-1 ring-white/10", className)}>
            <div className="relative flex flex-col w-full bg-[#3a3a3a] border border-white/10 rounded-2xl shadow-none transition-all focus-within:ring-0 focus-within:border-white/20">
                {selectedFiles.length > 0 && (
                    <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
                        {selectedFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-md text-sm border border-white/10">
                                <span className="truncate max-w-[150px]">{file.filename}</span>
                                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full resize-none border-0 bg-transparent p-4 pr-12 text-lg text-foreground placeholder-muted-foreground/70 outline-none min-h-[56px] max-h-[200px]"
                    placeholder={placeholder}
                    style={{ height: "60px" }}
                    onKeyDown={handleKeyDown}
                />

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={handleFileSelect}
                />

                <div className="flex justify-between items-center p-3 pt-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <PlusIcon />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-400 font-medium">Sonnet 3.5</span>
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() && selectedFiles.length === 0}
                            className="p-1.5 bg-[#d96c46] hover:bg-[#c9623e] text-white rounded-lg transition-all disabled:opacity-50 shadow-sm"
                        >
                            <ArrowUp size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function PlusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
    )
}
