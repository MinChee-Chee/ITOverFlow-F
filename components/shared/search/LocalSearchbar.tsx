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

  useEffect(() => {
    if (route !== '/' || pathname !== '/') {
      return;
    }

    const intervalId = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [route, pathname, router]);

  useEffect(() => {
    const urlQuery = searchParams.get('q');
    const currentParamsString = searchParams.toString();
    
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      previousQueryRef.current = urlQuery;
      searchParamsStringRef.current = currentParamsString;
      return;
    }

    if (urlQuery !== previousQueryRef.current && urlQuery !== search) {
      setSearch(urlQuery || '');
      previousQueryRef.current = urlQuery;
      previousSearchRef.current = urlQuery || '';
      searchParamsStringRef.current = currentParamsString;
    } else if (currentParamsString !== searchParamsStringRef.current) {
      searchParamsStringRef.current = currentParamsString;
    }
  }, [query, search]);

  useEffect(() => {
    if (search === previousSearchRef.current) {
      return;
    }

    previousSearchRef.current = search;

    const delayDebounceFn = setTimeout(() => {
      const freshQuery = searchParams.get('q');
      const freshParamsString = searchParams.toString();
      
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