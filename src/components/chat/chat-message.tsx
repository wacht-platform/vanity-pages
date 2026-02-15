import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
    role: "user" | "assistant"
    content: string
    timestamp?: string
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
    const isUser = role === "user"

    return (
        <div className={cn("group w-full text-gray-800 dark:text-gray-100", isUser ? "" : "bg-transparent")}>
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-[38rem] xl:max-w-3xl flex lg:px-0 m-auto w-full">
                <div className="flex flex-col relative items-end">
                    <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center shrink-0">
                        {isUser ? (
                            <Avatar className="h-7 w-7 rounded-md">
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">US</AvatarFallback>
                            </Avatar>
                        ) : (
                            <Avatar className="h-7 w-7 rounded-sm">
                                <div className="w-full h-full bg-orange-500 rounded-sm flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">AI</span>
                                </div>
                            </Avatar>
                        )}
                    </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                    <div className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 min-w-full break-words">
                        <p className="whitespace-pre-wrap">{content}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
