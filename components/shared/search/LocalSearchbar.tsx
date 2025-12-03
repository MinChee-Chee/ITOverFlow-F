"use client"

import { Input } from '@/components/ui/input'
import { formUrlQuery, removeKeysFromQuery } from '@/lib/utils'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams} from 'next/navigation'
import React, { useEffect, useState, useRef } from 'react'

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

  const [search, setSearch] = useState(query || '');

  // Sync search state with URL query param when it changes externally
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    
    // Only sync if URL query changed externally (not from our own update)
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      previousQueryRef.current = urlQuery;
      return;
    }

    // If URL query changed and it's different from our state, sync it
    if (urlQuery !== previousQueryRef.current) {
      setSearch(urlQuery || '');
      previousQueryRef.current = urlQuery;
    }
  }, [searchParams]);

  // Debounce and update URL when search changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentQuery = searchParams.get('q');
      
      // Only update if search actually changed
      if (currentQuery === search) {
        return;
      }

      isUpdatingUrlRef.current = true;

      if(search) {
        const newUrl = formUrlQuery({
          params: searchParams.toString(),
          key:'q',
          value: search
        })

        router.push( newUrl, { scroll: false});
      } else {
        if (pathname === route){
          const newUrl = removeKeysFromQuery({
            params: searchParams.toString(),
            keysToRemove: ['q'],
          })
          router.push( newUrl, { scroll: false});
        }
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search, route, pathname, router, searchParams]);

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