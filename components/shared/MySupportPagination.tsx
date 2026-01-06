"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formUrlQuery } from '@/lib/utils'

interface MySupportPaginationProps {
  pageNumber: number
  isNext: boolean
  totalPages: number
}

export default function MySupportPagination({ pageNumber, isNext, totalPages }: MySupportPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleNavigation = (direction: 'prev' | 'next') => {
    const nextPageNumber = direction === 'prev' ? pageNumber - 1 : pageNumber + 1

    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: 'mySupportPage',
      value: nextPageNumber.toString()
    })

    router.push(newUrl, { scroll: false })
  }

  const handlePageClick = (page: number) => {
    if (page === pageNumber) return

    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: 'mySupportPage',
      value: page.toString()
    })

    router.push(newUrl, { scroll: false })
  }

  if (!isNext && pageNumber === 1) return null

  // Calculate page numbers to show
  const pages: (number | string)[] = []
  const startPage = Math.max(1, pageNumber - 1)
  const endPage = Math.min(totalPages, pageNumber + 1)

  if (pageNumber > 2) {
    pages.push(1)
    if (startPage > 2) {
      pages.push('...')
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    if (i !== 1 || pageNumber <= 2) {
      pages.push(i)
    }
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('...')
    }
    pages.push(totalPages)
  }

  return (
    <div className="flex w-full items-center justify-center gap-2">
      <Button
        disabled={pageNumber === 1}
        onClick={() => handleNavigation('prev')}
        className="light-border-2 btn flex min-h-[36px] items-center justify-center gap-2 border"
      >
        <p className="body-medium text-dark200_light800">Prev</p>
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="body-medium text-dark400_light700 px-2"
              >
                ...
              </span>
            )
          }

          const pageNum = page as number
          const isActive = pageNum === pageNumber

          return (
            <button
              key={pageNum}
              onClick={() => handlePageClick(pageNum)}
              className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md px-3.5 py-2 transition-colors ${
                isActive
                  ? 'bg-primary-500'
                  : 'light-border-2 border bg-light-800 hover:bg-light-700 dark:bg-dark-300 dark:hover:bg-dark-400'
              }`}
            >
              <p className={`body-semibold ${
                isActive
                  ? 'text-light-900'
                  : 'text-dark200_light800'
              }`}>
                {pageNum}
              </p>
            </button>
          )
        })}
      </div>

      <Button
        disabled={!isNext}
        onClick={() => handleNavigation('next')}
        className="light-border-2 btn flex min-h-[36px] items-center justify-center gap-2 border"
      >
        <p className="body-medium text-dark200_light800">Next</p>
      </Button>
    </div>
  )
}
