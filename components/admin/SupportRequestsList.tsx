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
import Image from 'next/image'
import Link from 'next/link'
import NoResult from '@/components/shared/NoResult'
import SupportPagination from './SupportPagination'
import { formUrlQuery } from '@/lib/utils'

interface SupportRequest {
  _id: string
  userId: {
    _id: string
    name: string
    username: string
    email: string
    picture: string
  }
  clerkId: string
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

interface SupportRequestsListProps {
  initialStatus?: string
  initialCategory?: string
}

export default function SupportRequestsList({ 
  initialStatus = 'pending',
  initialCategory 
}: SupportRequestsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([])
  const [status, setStatus] = useState(initialStatus)
  const [category, setCategory] = useState(initialCategory || 'all')
  const page = parseInt(searchParams.get('supportPage') || '1')
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
      
      if (category && category !== 'all') {
        params.append('category', category)
      }

      const response = await fetch(`/api/support?${params.toString()}`)
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
        description: "Failed to load support requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupportRequests()
  }, [status, category, page])

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
          <h2 className="h2-semibold text-dark100_light900">Support Requests</h2>
          <p className="paragraph-regular text-dark400_light700 mt-2">
            Manage and respond to user support requests
          </p>
        </div>

        <div className="flex gap-4">
          <Select value={status} onValueChange={(value) => {
            setStatus(value)
            // Reset to page 1 when filter changes
            const newUrl = formUrlQuery({
              params: searchParams.toString(),
              key: 'supportPage',
              value: '1'
            })
            router.push(newUrl, { scroll: false })
          }}>
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

          <Select value={category} onValueChange={(value) => {
            setCategory(value)
            // Reset to page 1 when filter changes
            const newUrl = formUrlQuery({
              params: searchParams.toString(),
              key: 'supportPage',
              value: '1'
            })
            router.push(newUrl, { scroll: false })
          }}>
            <SelectTrigger className="sm:min-w-[150px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-dark-400 dark:text-light-700">Loading support requests...</p>
        </div>
      ) : supportRequests.length === 0 ? (
        <NoResult
          title="No Support Requests Found"
          description="There are no support requests matching your filters."
          link="/admin"
          linkTitle="Back to Dashboard"
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
                  <div className="flex items-start gap-4 flex-1">
                    <Link href={`/profile/${request.userId._id}`}>
                      <Image
                        src={request.userId.picture || '/assets/images/default-logo.svg'}
                        alt={request.userId.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/profile/${request.userId._id}`}
                          className="h3-semibold text-dark100_light900 hover:text-primary-500"
                        >
                          {request.userId.name}
                        </Link>
                        <span className="text-sm text-dark-400 dark:text-light-700">
                          @{request.userId.username}
                        </span>
                      </div>
                      <p className="text-sm text-dark-400 dark:text-light-700">
                        {request.userId.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {getCategoryLabel(request.category)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="h4-semibold text-dark100_light900 mb-2">
                    {request.subject}
                  </h4>
                  <p className="text-sm text-dark400_light700 whitespace-pre-wrap">
                    {request.message}
                  </p>
                </div>

                {request.adminResponse && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">Admin Response:</span>
                      {request.respondedBy && (
                        <span className="text-sm text-dark-400 dark:text-light-700">
                          by {request.respondedBy.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dark400_light700 whitespace-pre-wrap">
                      {request.adminResponse}
                    </p>
                    {request.respondedAt && (
                      <p className="text-xs text-dark-400 dark:text-light-700 mt-2">
                        Responded: {formatDate(request.respondedAt)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-dark-400 dark:text-light-700">
                    Submitted: {formatDate(request.createdAt)}
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/support/${request._id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <SupportPagination
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
