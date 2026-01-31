import { useState } from 'react'

export interface ServerPaginationOptions {
  initialPage?: number
  initialPageSize?: number
  pageSizeOptions?: number[]
}

export interface ServerPaginationResult {
  // Pagination state
  currentPage: number
  pageSize: number
  
  // Navigation functions
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  
  // Helper properties
  pageSizeOptions: number[]
}

export function useServerPagination(
  options: ServerPaginationOptions = {}
): ServerPaginationResult {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [5, 10, 20, 50, 100]
  } = options

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const handleSetPageSize = (size: number) => {
    setPageSize(size)
    // Reset to first page when changing page size
    setCurrentPage(1)
  }

  return {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize: handleSetPageSize,
    pageSizeOptions
  }
}
