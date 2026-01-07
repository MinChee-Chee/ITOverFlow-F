"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function SupportRequestForm() {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<'general' | 'account' | 'technical' | 'content' | 'billing' | 'other'>('general')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (subject.length > 200) {
      toast({
        title: "Validation Error",
        description: "Subject must be 200 characters or less.",
        variant: "destructive",
      })
      return
    }

    if (message.length > 5000) {
      toast({
        title: "Validation Error",
        description: "Message must be 5000 characters or less.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit support request')
      }

      toast({
        title: "Support Request Submitted",
        description: "Your support request has been submitted successfully. We'll get back to you soon.",
      })

      // Reset form
      setSubject('')
      setCategory('general')
      setMessage('')
    } catch (error) {
      console.error('Error submitting support request:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to submit support request. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 rounded-lg border p-4 sm:p-6">
      <div>
        <h3 className="h3-semibold text-[18px] sm:text-[20px] mb-2">Submit a Support Request</h3>
        <p className="text-xs sm:text-sm text-dark-400 dark:text-light-700">
          Fill out the form below and we'll get back to you as soon as possible.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm sm:text-base">Category *</Label>
        <Select value={category} onValueChange={(value: any) => setCategory(value)}>
          <SelectTrigger id="category" className="h-10 sm:h-11">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Support</SelectItem>
            <SelectItem value="account">Account Issues</SelectItem>
            <SelectItem value="technical">Technical Support</SelectItem>
            <SelectItem value="content">Content Moderation</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject" className="text-sm sm:text-base">Subject *</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          maxLength={200}
          required
          className="text-sm sm:text-base"
        />
        <p className="text-xs text-dark-400 dark:text-light-700">
          {subject.length}/200 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="text-sm sm:text-base">Message *</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please provide detailed information about your issue or question..."
          rows={5}
          className="min-h-[120px] sm:min-h-[150px] text-sm sm:text-base resize-y"
          maxLength={5000}
          required
        />
        <p className="text-xs text-dark-400 dark:text-light-700">
          {message.length}/5000 characters
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !subject.trim() || !message.trim()}
        className="w-full h-10 sm:h-11 text-sm sm:text-base"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
      </Button>
    </form>
  )
}
