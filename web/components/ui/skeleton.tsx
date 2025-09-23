import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-busy="true"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

function SkeletonText({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("h-4 bg-muted rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton, SkeletonText }
