import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#003366] text-white hover:bg-[#002952] shadow-sm hover:shadow-md",
        destructive:
          "bg-[#cc3333] text-white hover:bg-[#b32d2d] focus:ring-2 focus:ring-[#cc3333]/50 shadow-sm hover:shadow-md",
        outline:
          "border border-[#d1d5db] bg-white hover:bg-[#f9fafb] text-[#1a1a1a] hover:border-[#9ca3af]",
        secondary:
          "bg-[#e6e6e6] text-[#1a1a1a] hover:bg-[#d1d5db]",
        ghost:
          "hover:bg-[#f3f4f6] text-[#1a1a1a]",
        link: "text-[#003366] underline-offset-4 hover:underline hover:text-[#002952]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
