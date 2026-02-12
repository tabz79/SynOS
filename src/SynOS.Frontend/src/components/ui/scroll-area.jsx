import { cn } from "@/lib/utils"

export const ScrollArea = ({ children, className }) => (
    <div className={cn("relative overflow-auto", className)}>
        {children}
    </div>
)
