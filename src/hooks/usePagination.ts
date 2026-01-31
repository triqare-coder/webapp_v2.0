import { useState, useMemo } from 'react'

export interface PaginationOptions {
  initialPage?: number
  initialPageSize?: number
  pageSizeOptions?: number[]
}

export interface PaginationResult<T> {
  // Current page data
  currentPageData: T[]
  
  // Pagination state
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
  
  // Navigation functions
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  setPageSize: (size: number) => void
  
  // Helper properties
  hasNextPage: boolean
  hasPreviousPage: boolean
  startIndex: number
  endIndex: number
  pageSizeOptions: number[]
}

export function usePagination<T>(
  data: T[] = [],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [5, 10, 20, 50, 100]
  } = options

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalItems = data?.length || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  // Calculate current page data
  const currentPageData = useMemo(() => {
    if (!data || data.length === 0) return []
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, pageSize])

  // Navigation functions
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToFirstPage = () => {
    setCurrentPage(1)
  }

  const goToLastPage = () => {
    setCurrentPage(totalPages)
  }

  const handleSetPageSize = (size: number) => {
    setPageSize(size)
    // Adjust current page if necessary
    const newTotalPages = Math.ceil(totalItems / size)
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages || 1)
    }
  }

  // Helper properties
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalItems)

  return {
    currentPageData,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: handleSetPageSize,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    pageSizeOptions
  }
}
