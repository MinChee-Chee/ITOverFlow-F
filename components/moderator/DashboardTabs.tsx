"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReactNode } from 'react'

// DashboardTabs component for moderator dashboard

interface DashboardTabsProps {
  currentType: 'question' | 'answer' | 'all'
  children: ReactNode
}

export default function DashboardTabs({ currentType, children }: DashboardTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', value)
    params.delete('page') // Reset to page 1 when changing tabs
    router.push(`/moderator/dashboard?${params.toString()}`)
  }

  return (
    <Tabs value={currentType} onValueChange={handleTabChange} className="w-full">
      <TabsList className="background-light800_dark400 min-h-[42px] p-1">
        <TabsTrigger value="all" className="tab">
          All Content
        </TabsTrigger>
        <TabsTrigger value="question" className="tab">
          Questions
        </TabsTrigger>
        <TabsTrigger value="answer" className="tab">
          Answers
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-6">
        {children}
      </TabsContent>

      <TabsContent value="question" className="mt-6">
        {children}
      </TabsContent>

      <TabsContent value="answer" className="mt-6">
        {children}
      </TabsContent>
    </Tabs>
  )
}
