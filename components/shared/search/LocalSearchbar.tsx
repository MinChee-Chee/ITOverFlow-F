"use client"

import { Input } from '@/components/ui/input'
import { formUrlQuery, removeKeysFromQuery } from '@/lib/utils'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams} from 'next/navigation'
import React, { useEffect, useState, useRef, useMemo } from 'react'

interface CustomInputProps {
  route: string
  iconPosition: string
  imgSrc: string
  placeholder: string
  otherClasses?: string
}

const LocalSearchbar = ({
  route,
  iconPosition,
  imgSrc,
  placeholder,
  otherClasses,
}: CustomInputProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get('q');
  const isUpdatingUrlRef = useRef(false);
  const previousQueryRef = useRef(query);
  const previousSearchRef = useRef(query || '');
  const searchParamsStringRef = useRef(searchParams.toString());

  const [search, setSearch] = useState(query || '');
  const inputId = useMemo(() => {
    const normalizedRoute = route.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
    return `local-search-${normalizedRoute || 'home'}`;
  }, [route]);

  // Auto-refresh for home page only (every 10 seconds)
  useEffect(() => {
    // Only enable auto-refresh on home page
    if (route !== '/' || pathname !== '/') {
      return;
    }

    const intervalId = setInterval(() => {
      // Refresh the page by updating the URL with current search params
      // This will trigger a re-render of the server component
      // Use router.refresh() to refresh the current route without navigation
      router.refresh();
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, [route, pathname, router]);

  // Sync search state with URL query param when it changes externally (only on mount or external changes)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const currentParamsString = searchParams.toString();
    
    // Only sync if URL query changed externally (not from our own update)
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      previousQueryRef.current = urlQuery;
      searchParamsStringRef.current = currentParamsString;
      return;
    }

    // Only update if the actual query value changed (not just the searchParams object reference)
    if (urlQuery !== previousQueryRef.current && urlQuery !== search) {
      setSearch(urlQuery || '');
      previousQueryRef.current = urlQuery;
      previousSearchRef.current = urlQuery || '';
      searchParamsStringRef.current = currentParamsString;
    } else if (currentParamsString !== searchParamsStringRef.current) {
      // Update ref even if query didn't change, to track params changes
      searchParamsStringRef.current = currentParamsString;
    }
  }, [query, search]); // Use query (string) instead of searchParams (object)

  // Debounce and update URL when search changes (only if user actually typed)
  useEffect(() => {
    // Skip if search hasn't actually changed from previous value
    if (search === previousSearchRef.current) {
      return;
    }

    // Update the ref immediately to prevent duplicate calls
    previousSearchRef.current = search;

    const delayDebounceFn = setTimeout(() => {
      // Get fresh values to check if URL was updated externally
      // This prevents race conditions where params change during the debounce delay
      const freshQuery = searchParams.get('q');
      const freshParamsString = searchParams.toString();
      
      // Only update if search actually changed from URL
      // This prevents unnecessary updates if URL was already updated
      if (freshQuery === search) {
        return;
      }

      isUpdatingUrlRef.current = true;

      if(search) {
        const newUrl = formUrlQuery({
          params: freshParamsString,
          key:'q',
          value: search
        })

        router.replace( newUrl, { scroll: false});
      } else {
        if (pathname === route){
          const newUrl = removeKeysFromQuery({
            params: freshParamsString,
            keysToRemove: ['q'],
          })
          router.replace( newUrl, { scroll: false});
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, route, pathname, router]); // Only depend on search state, not query

  return (
    <div className={`background-light800_darkgradient flex min-h-[56px] grow items-center gap-4 rounded-[10px] px-4 ${otherClasses}`}>
      {iconPosition === 'left' && (
        <Image 
          src={imgSrc}
          alt="search icon"
          width={24}
          height={24}
          className="cursor-pointer"
        />
      )}

      <Input
        type="text"
        id={inputId}
        name={inputId}
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="paragraph-regular no-focus placeholder background-light800_darkgradient text-dark100_light900 border-none shadow-none outline-none"
      />

      {iconPosition === 'right' && (
        <Image 
          src={imgSrc}
          alt="search icon"
          width={24}
          height={24}
          className="cursor-pointer"
        />
      )}
    </div>
  )
}

export default LocalSearchbar