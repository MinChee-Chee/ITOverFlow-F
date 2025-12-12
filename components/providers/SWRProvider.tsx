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
        revalidateOnFocus: false, // Disabled to prevent excessive refreshes - enable per-query if needed
        revalidateOnReconnect: true,
        dedupingInterval: 45000, // 45 seconds to reduce duplicate requests
        refreshInterval: 45000, // Slow down background refreshes globally
        revalidateIfStale: false, // Don't revalidate stale data automatically
      }}
    >
      {children}
    </SWRConfig>
  )
}

