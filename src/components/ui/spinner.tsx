import { cn } from "@/lib/utils";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-3",
    };

    return (
        <div
            className={cn(
                "animate-spin rounded-full border-muted-foreground/30 border-t-muted-foreground",
                sizeClasses[size],
                className
            )}
        />
    );
}

export function LoadingScreen({
    message = "Loading...",
    className,
}: {
    message?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex h-full w-full flex-col items-center justify-center gap-3 px-4 font-sans", className)}>
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}
