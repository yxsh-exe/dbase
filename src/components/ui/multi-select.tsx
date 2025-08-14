"use client"

import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ChevronsUpDown } from "lucide-react"
import * as React from "react"

export interface MultiSelectOption {
    label: string
    value: string
    icon?: React.ReactNode
    color?: string
    description?: string
    disabled?: boolean
}

interface MultiSelectProps {
    options: MultiSelectOption[]
    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    className?: string
    maxCount?: number
    modalPopover?: boolean
    asChild?: boolean
    disabled?: boolean
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select items...",
    className,
    modalPopover = false,
    disabled = false,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const getColorClasses = (color: string) => {
        switch (color) {
            case 'yellow':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'blue':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'purple':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'red':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'green':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'emerald':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'cyan':
                return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            case 'gray':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    const handleUnselect = (item: string) => {
        onChange(value.filter(v => v !== item))
    }

    const handleSelect = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter(v => v !== optionValue))
        } else {
            onChange([...value, optionValue])
        }
        // Keep dropdown open for multiple selections
        setOpen(true)
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={modalPopover}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between text-left font-normal",
                        !value.length && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                    onClick={() => setOpen(!open)}
                >
                    <div className="flex gap-1 flex-wrap items-center min-h-[1.5rem] max-w-full">
                        {value.length > 0 ? (
                            value.map((item) => {
                                const option = options.find(opt => opt.value === item)
                                return (
                                    <div
                                        key={item}
                                        className={cn(
                                            "inline-flex items-center justify-center w-6 h-6 rounded border shrink-0",
                                            option?.color && getColorClasses(option.color)
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleUnselect(item)
                                        }}
                                        title={`${option?.label || item} (click to remove)`}
                                    >
                                        {option?.icon}
                                    </div>
                                )
                            })
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-64 overflow-y-auto p-1">
                    {options.map((option) => {
                        const isSelected = value.includes(option.value)
                        return (
                            <div
                                key={option.value}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    option.disabled && "pointer-events-none opacity-50",
                                    isSelected && "bg-accent text-accent-foreground"
                                )}
                                onClick={() => {
                                    if (!option.disabled) {
                                        handleSelect(option.value)
                                    }
                                }}
                            >
                                <div className="flex items-center space-x-2 w-full">
                                    {option.icon && <span>{option.icon}</span>}
                                    <div className="flex-1">
                                        <div className="font-medium">{option.label}</div>
                                        {option.description && (
                                            <div className="text-xs text-muted-foreground">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <div className="ml-auto">
                                            <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                <div className="h-2 w-2 rounded-full bg-current" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}