"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
  searchText?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter((option) => {
      const searchText = option.searchText || option.label
      return searchText.toLowerCase().includes(searchValue.toLowerCase())
    })
  }, [options, searchValue])

  const selectedOption = options.find((option) => option.value === value)

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange?.("")
    } else {
      onValueChange?.(selectedValue)
    }
    setOpen(false)
    setSearchValue("")
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between bg-white",
              !selectedOption && "text-muted-foreground",
              triggerClassName
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-full p-0 bg-white border shadow-md", contentClassName)}
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <div className="flex items-center border-b px-3 bg-white">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
            />
          </div>
          <div className="max-h-60 overflow-auto bg-white">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground bg-white">
                {emptyText}
              </div>
            ) : (
              <div className="p-1 bg-white">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground",
                      option.disabled && "pointer-events-none opacity-50",
                      value === option.value && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
