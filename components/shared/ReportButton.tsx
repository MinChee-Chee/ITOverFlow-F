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

interface ReportButtonProps {
  type: 'question' | 'answer' | 'comment'
  questionId?: string
  answerId?: string
  commentId?: string
  userId: string
}

export default function ReportButton({ type, questionId, answerId, commentId, userId }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for reporting this question.",
        variant: "destructive",
      })
      return
    }

    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to report a question.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const body: any = {
        type,
        reason: reason.trim(),
      }

      if (type === 'question' && questionId) {
        body.questionId = questionId
      } else if (type === 'answer' && answerId) {
        body.answerId = answerId
      } else if (type === 'comment' && commentId) {
        body.commentId = commentId
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Flag className="h-4 w-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report {type === 'question' ? 'Question' : type === 'answer' ? 'Answer' : 'Comment'}</DialogTitle>
          <DialogDescription>
            Please provide a reason for reporting this {type}. Moderators will review your report.
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
                placeholder={`Please explain why you are reporting this ${type} (e.g., inappropriate content, spam, duplicate, etc.)`}
                rows={5}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
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
