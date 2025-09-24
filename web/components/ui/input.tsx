import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Ensure `value` is never null. React warns when `value` is null — prefer
  // an empty string for controlled inputs. If callers pass `value: null`,
  // coerce it to '' here so components don't need to guard everywhere.
  // Use `Partial` + `unknown` to avoid `any` and satisfy eslint rules.
  const safeProps = { ...props } as Partial<React.ComponentProps<'input'>> & { value?: unknown }
  if (Object.prototype.hasOwnProperty.call(safeProps, 'value') && safeProps.value == null) {
    ;(safeProps as Partial<React.ComponentProps<'input'>> & { value?: string }).value = ''
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
  {...(safeProps as React.ComponentProps<'input'>)}
    />
  )
}

export { Input }
