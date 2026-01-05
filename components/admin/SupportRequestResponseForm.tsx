"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface SupportRequestResponseFormProps {
  supportRequestId: string
  currentStatus: 'pending' | 'in_progress' | 'resolved' | 'closed'
  hasResponse: boolean
}

export default function SupportRequestResponseForm({
  supportRequestId,
  currentStatus,
  hasResponse,
}: SupportRequestResponseFormProps) {
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState(currentStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!response.trim() && status === currentStatus) {
      toast({
        title: "Validation Error",
        description: "Please provide a response or change the status.",
        variant: "destructive",
      })
      return
    }

    if (response.length > 5000) {
      toast({
        title: "Validation Error",
        description: "Response must be 5000 characters or less.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const responseData = await fetch(`/api/support/${supportRequestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminResponse: response.trim() || undefined,
          status,
        }),
      })

      const data = await responseData.json()

      if (!responseData.ok) {
        throw new Error(data.error || 'Failed to update support request')
      }

      toast({
        title: "Support Request Updated",
        description: "The support request has been updated successfully.",
      })

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error updating support request:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update support request. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
      <div>
        <h3 className="h3-semibold mb-4">
          {hasResponse ? 'Update Response' : 'Respond to Request'}
        </h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select value={status} onValueChange={(value: any) => setStatus(value)}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="response">
          {hasResponse ? 'Update Response' : 'Response'} {!hasResponse && '*'}
        </Label>
        <Textarea
          id="response"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Enter your response to the user..."
          rows={6}
          maxLength={5000}
          required={!hasResponse}
        />
        <p className="text-xs text-muted-foreground">
          {response.length}/5000 characters
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || (!response.trim() && status === currentStatus)}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? 'Updating...' : hasResponse ? 'Update Response' : 'Submit Response'}
      </Button>
    </form>
  )
}
