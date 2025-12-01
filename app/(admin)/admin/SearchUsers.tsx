'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { formUrlQuery, removeKeysFromQuery } from '@/lib/utils'
import { useEffect, useState, useRef } from 'react'

export const SearchUsers = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isNavigatingRef = useRef(false)
  const searchParamsRef = useRef(searchParams)
  const pathnameRef = useRef(pathname)

  // Update refs when they change (but don't trigger re-renders)
  useEffect(() => {
    searchParamsRef.current = searchParams
    pathnameRef.current = pathname
  })

  // Initialize state from URL on mount
  const [search, setSearch] = useState(() => searchParams.get('search') || '')

  // Sync state with URL only when search param changes externally (not during user typing)
  const urlSearch = searchParams.get('search') || ''
  const prevUrlSearchRef = useRef(urlSearch)
  
  useEffect(() => {
    if (urlSearch !== prevUrlSearchRef.current) {
      prevUrlSearchRef.current = urlSearch
      if (!isNavigatingRef.current && urlSearch !== search) {
        setSearch(urlSearch)
      }
    }
  }, [urlSearch, search]) // Only depend on the actual string value

  useEffect(() => {
    // Skip if we're already navigating
    if (isNavigatingRef.current) {
      return
    }

    const currentSearchParam = searchParamsRef.current.get('search') || ''
    if (search === currentSearchParam) {
      return
    }

    const delayDebounceFn = setTimeout(() => {
      isNavigatingRef.current = true

      if (search) {
        const newUrl = formUrlQuery({
          params: searchParamsRef.current.toString(),
          key: 'search',
          value: search,
        })
        // Reset page to 1 when searching
        const urlWithPage = formUrlQuery({
          params: newUrl.split('?')[1] || '',
          key: 'page',
          value: '1',
        })
        router.push(urlWithPage, { scroll: false })
      } else {
        if (pathnameRef.current === '/admin') {
          const newUrl = removeKeysFromQuery({
            params: searchParamsRef.current.toString(),
            keysToRemove: ['search'],
          })
          router.push(newUrl, { scroll: false })
        }
      }

      // Reset navigation flag after a short delay
      setTimeout(() => {
        isNavigatingRef.current = false
      }, 100)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [search, router]) // Removed searchParams and pathname from dependencies

  return (
    <div className="flex-1">
      <div className="background-light800_darkgradient relative flex min-h-[56px] grow items-center gap-4 rounded-[10px] px-4">
        <Image
          src="/assets/icons/search.svg"
          alt="search"
          width={24}
          height={24}
          className="cursor-pointer dark:invert"
        />
        <Input
          type="text"
          placeholder="Search for users by name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="paragraph-regular no-focus placeholder background-light800_darkgradient text-dark100_light900 border-none shadow-none outline-none"
        />
      </div>
    </div>
  )
}

