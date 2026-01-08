"use client"

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, memo, useRef, useEffect } from "react";

  

interface Props {
    filters: {
        name: string, 
        value: string
    }[];
    otherClasses?: string;
    containerClasses?: string;
    }

const Filter = memo(({filters, otherClasses, containerClasses}:(Props)) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParamsRef = useRef(searchParams);
    const pathnameRef = useRef(pathname);

    useEffect(() => {
        searchParamsRef.current = searchParams;
        pathnameRef.current = pathname;
    });

    const paramFilter = searchParams.get('filter');

    const handleUpdateParams = useCallback((value: string) => {
        if (value === paramFilter) {
            return
        }
        
        const params = new URLSearchParams(searchParamsRef.current.toString())
        params.set('filter', value)
        params.set('page', '1')
        router.replace(`${pathnameRef.current}?${params.toString()}`, {scroll: false})
    }, [paramFilter, router]) // Removed searchParams and pathname from dependencies

  return (
    <div className={`relative ${containerClasses}`}>
        <Select
            onValueChange={ handleUpdateParams}
            value={paramFilter || undefined}
        >
            <SelectTrigger className={`${otherClasses} body-regular light-border background-light800_dark300 text-dark500_light700 border px-5 py-2.5`}>            
                <div className="line-clamp-1 flex-1 text-left">
                <SelectValue placeholder="Select a filter" />
                </div>
            </SelectTrigger>
            <SelectContent className="text-dark400_light700 small-regular
            border-none bg-light-900 dark:bg-dark-300">
                <SelectGroup>
                    {filters.map((item) => (
                        <SelectItem key={item.value} value={item.value}
                        className="cursor-pointer focus:bg-light-800
                        dark:focus:bg-dark-400">
                            {item.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>

    </div>
  )
})

Filter.displayName = 'Filter'

export default Filter