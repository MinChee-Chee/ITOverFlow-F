import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-500 text-white hover:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-500",
        secondary:
          "border-transparent bg-light-800 dark:bg-dark-400 text-dark-200 dark:text-light-800 hover:bg-light-700 dark:hover:bg-dark-300",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-400 dark:bg-red-600 dark:hover:bg-red-500",
        outline: "border-light-700 dark:border-dark-400 text-dark-200 dark:text-light-800 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
