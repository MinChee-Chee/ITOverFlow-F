import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-500 text-white hover:bg-blue-400 dark:bg-blue-600 dark:hover:bg-blue-500",
        destructive:
          "bg-red-500 text-white hover:bg-red-400 dark:bg-red-600 dark:hover:bg-red-500",
        outline:
          "border border-light-700 dark:border-dark-400 bg-white dark:bg-dark-300 hover:bg-light-800 dark:hover:bg-dark-400 text-dark-200 dark:text-light-800",
        secondary:
          "bg-light-800 dark:bg-dark-400 text-dark-200 dark:text-light-800 hover:bg-light-700 dark:hover:bg-dark-300",
        ghost: "hover:bg-light-800 dark:hover:bg-dark-400 text-dark-200 dark:text-light-800",
        link: "text-blue-500 dark:text-blue-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
