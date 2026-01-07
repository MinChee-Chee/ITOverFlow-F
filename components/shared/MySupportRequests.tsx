"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import NoResult from '@/components/shared/NoResult'
import MySupportPagination from './MySupportPagination'
import { formUrlQuery } from '@/lib/utils'
import Link from 'next/link'

interface SupportRequest {
  _id: string
  subject: string
  category: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  adminResponse?: string
  respondedBy?: {
    _id: string
    name: string
    username: string
  }
  respondedAt?: string
  createdAt: string
  updatedAt: string
}

export default function MySupportRequests() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([])
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const page = parseInt(searchParams.get('mySupportPage') || '1')
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })

  const fetchSupportRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      })
      
      if (status && status !== 'all') {
        params.append('status', status)
      }

      const response = await fetch(`/api/support/my-requests?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch support requests')
      }

      setSupportRequests(data.supportRequests || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching support requests:', error)
      toast({
        title: "Error",
        description: "Failed to load your support requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupportRequests()
  }, [status, page])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'in_progress':
        return 'secondary'
      case 'resolved':
        return 'outline'
      case 'closed':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      account: 'Account',
      technical: 'Technical',
      content: 'Content',
      billing: 'Billing',
      other: 'Other',
    }
    return labels[category] || category
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="h2-semibold text-dark100_light900">My Support Requests</h2>
          <p className="paragraph-regular text-dark400_light700 mt-2">
            View the status and responses to your support requests
          </p>
        </div>

        <Select 
          value={status} 
          onValueChange={(value) => {
            setStatus(value)
            const newUrl = formUrlQuery({
              params: searchParams.toString(),
              key: 'mySupportPage',
              value: '1'
            })
            router.push(newUrl, { scroll: false })
          }}
        >
          <SelectTrigger className="sm:min-w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-dark-400 dark:text-light-700">Loading your support requests...</p>
        </div>
      ) : supportRequests.length === 0 ? (
        <NoResult
          title="No Support Requests Found"
          description="You haven't submitted any support requests yet, or there are no requests matching your filters."
          link="/support"
          linkTitle="Submit a Request"
        />
      ) : (
        <>
          <div className="space-y-4">
            {supportRequests.map((request) => (
              <div
                key={request._id}
                className="background-light900_dark200 rounded-lg border p-6 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="h3-semibold text-dark100_light900">
                        {request.subject}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {getCategoryLabel(request.category)}
                      </Badge>
                    </div>
                    <p className="text-sm text-dark-400 dark:text-light-700 mb-4">
                      Submitted: {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Your Message:</h4>
                  <div className="background-light800_dark400 rounded-lg p-4">
                    <p className="text-sm text-dark400_light700 whitespace-pre-wrap">
                      {request.message}
                    </p>
                  </div>
                </div>

                {request.adminResponse ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">Admin Response:</span>
                      {request.respondedBy && (
                        <span className="text-sm text-dark-400 dark:text-light-700">
                          by {request.respondedBy.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dark400_light700 whitespace-pre-wrap mb-2">
                      {request.adminResponse}
                    </p>
                    {request.respondedAt && (
                      <p className="text-xs text-dark-400 dark:text-light-700">
                        Responded: {formatDate(request.respondedAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-sm text-dark-400 dark:text-light-700">
                      No response yet. Our team will get back to you soon.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-dark-400 dark:text-light-700">
                    Last updated: {formatDate(request.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <MySupportPagination
              pageNumber={page}
              isNext={pagination.hasNext}
              totalPages={pagination.totalPages}
            />
          )}
        </>
      )}
    </div>
  )
}
