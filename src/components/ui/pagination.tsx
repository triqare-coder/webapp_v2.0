"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
  hasPreviousPage: boolean
  className?: string
}

interface PaginationWithInfoProps extends PaginationProps {
  startIndex: number
  endIndex: number
  totalItems: number
  pageSize: number
  pageSizeOptions: number[]
  onPageSizeChange: (size: number) => void
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({ currentPage, totalPages, onPageChange, hasNextPage, hasPreviousPage, className }, ref) => {
    // Generate page numbers to show
    const getPageNumbers = () => {
      const pages: (number | string)[] = []
      const maxVisiblePages = 7

      if (totalPages <= maxVisiblePages) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Always show first page
        pages.push(1)

        if (currentPage > 4) {
          pages.push('...')
        }

        // Show pages around current page
        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)

        for (let i = start; i <= end; i++) {
          if (i !== 1 && i !== totalPages) {
            pages.push(i)
          }
        }

        if (currentPage < totalPages - 3) {
          pages.push('...')
        }

        // Always show last page
        if (totalPages > 1) {
          pages.push(totalPages)
        }
      }

      return pages
    }

    const pageNumbers = getPageNumbers()

    return (
      <div ref={ref} className={cn("flex items-center justify-center space-x-2", className)}>
        {/* First page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }
)
Pagination.displayName = "Pagination"

const PaginationWithInfo = React.forwardRef<HTMLDivElement, PaginationWithInfoProps>(
  ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    hasNextPage, 
    hasPreviousPage, 
    startIndex, 
    endIndex, 
    totalItems, 
    pageSize, 
    pageSizeOptions, 
    onPageSizeChange,
    className 
  }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
        {/* Items info and page size selector */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Showing {startIndex} to {endIndex} of {totalItems} entries
          </span>
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>entries</span>
          </div>
        </div>

        {/* Pagination controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      </div>
    )
  }
)
PaginationWithInfo.displayName = "PaginationWithInfo"

export { Pagination, PaginationWithInfo }
