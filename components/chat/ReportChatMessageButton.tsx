"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from '@/hooks/use-toast'
import { Flag } from 'lucide-react'

interface ReportChatMessageButtonProps {
  messageId: string
  userId: string
}

export default function ReportChatMessageButton({ messageId, userId }: ReportChatMessageButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for reporting this message.",
        variant: "destructive",
      })
      return
    }

    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to report a message.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'chatMessage',
          chatMessageId: messageId,
          reason: reason.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      toast({
        title: "Report submitted",
        description: "Thank you for your report. Moderators will review it shortly.",
      })

      // Reset form
      setReason('')
      setOpen(false)
    } catch (error) {
      console.error('Error submitting report:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to submit report. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!userId) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-xs text-dark-400 dark:text-light-700 hover:text-red-500 dark:hover:text-red-400"
          onClick={(e) => e.stopPropagation()}
        >
          <Flag className="h-3 w-3" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report Chat Message</DialogTitle>
          <DialogDescription>
            Please provide a reason for reporting this message. Moderators will review your report.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Reporting *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why you are reporting this message (e.g., abusive language, harassment, spam, etc.)"
                rows={5}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-dark-400 dark:text-light-700">
                Be specific and provide details to help moderators understand the issue.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setReason('')
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
