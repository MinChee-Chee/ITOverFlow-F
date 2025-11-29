'use client'

import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/utils'

interface SWRProviderProps {
  children: React.ReactNode
}

export default function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000, // Dedupe requests within 2 seconds
      }}
    >
      {children}
    </SWRConfig>
  )
}

