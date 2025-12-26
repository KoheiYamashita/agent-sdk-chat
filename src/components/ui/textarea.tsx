import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input/50 placeholder:text-muted-foreground aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/40 flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-4 py-3 text-base shadow-sm transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-input focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] focus-visible:bg-input/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
