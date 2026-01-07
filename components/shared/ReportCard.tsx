"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from 'next/link'
import Image from 'next/image'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import ClientTimestamp from './ClientTimestamp'
import ParseHTML from './ParseHTML'

interface ReportCardProps {
  report: {
    _id: string
    type: 'question' | 'answer' | 'comment' | 'chatMessage'
    reporter: {
      _id: string
      clerkId: string
      name: string
      username: string
      picture: string
    } | null
    question?: {
      _id: string
      title: string
      content: string
      createdAt: Date
      author: {
        _id: string
        clerkId: string
        name: string
        username: string
        picture: string
      }
    } | null
    answer?: {
      _id: string
      content: string
      createdAt: Date
      author: {
        _id: string
        clerkId: string
        name: string
        username: string
        picture: string
      }
      question?: {
        _id: string
        title: string
      }
    } | null
    comment?: {
      _id: string
      content: string
      createdAt: Date
      author: {
        _id: string
        clerkId: string
        name: string
        username: string
        picture: string
      }
      answer?: {
        _id: string
        content: string
        question?: {
          _id: string
          title: string
        }
      }
    } | null
    chatMessage?: {
      _id: string
      content: string
      createdAt: Date
      author: {
        _id: string
        clerkId: string
        name: string
        username: string
        picture: string
      }
      chatGroup?: {
        _id: string
        name: string
      }
    } | null
    reason: string
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
    reviewedBy?: {
      _id: string
      clerkId: string
      name: string
      username: string
    } | null
    reviewedAt?: Date
    createdAt: Date
  }
}

export default function ReportCard({ report }: ReportCardProps) {
  // Safety check - return null if report is invalid
  if (!report || !report._id) {
    return null
  }

  const [open, setOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBanning, setIsBanning] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [warningMessage, setWarningMessage] = useState('')
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'reviewed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'resolved':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'dismissed':
        return 'bg-light-800 dark:bg-dark-400 text-dark-400 dark:text-light-700 border-light-700 dark:border-dark-400'
      default:
        return 'bg-light-800 dark:bg-dark-400 text-dark-400 dark:text-light-700 border-light-700 dark:border-dark-400'
    }
  }

  const handleStatusUpdate = async (newStatus: 'reviewed' | 'resolved' | 'dismissed') => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/reports/${report._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update report status')
      }

      toast({
        title: "Status updated",
        description: `Report status updated to ${newStatus}.`,
      })

      router.refresh()
      setOpen(false)
    } catch (error) {
      console.error('Error updating report status:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update report status',
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteWithWarning = async () => {
    if (!warningReason.trim() || !warningMessage.trim()) {
      toast({
        title: "Validation error",
        description: "Please provide both reason and warning message.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      let url = ''
      let contentType = ''

      if (reportType === 'question' && question?._id) {
        url = `/api/questions/${question._id}/delete-with-warning`
        contentType = 'question'
      } else if (reportType === 'answer' && answer?._id) {
        url = `/api/answers/${answer._id}/delete-with-warning`
        contentType = 'answer'
      } else if (reportType === 'comment' && comment?._id) {
        url = `/api/comments/${comment._id}/delete-with-warning`
        contentType = 'comment'
      } else {
        throw new Error(`${reportType} has already been deleted.`)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: warningReason.trim(),
          message: warningMessage.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete ${contentType} and create warning`)
      }

      toast({
        title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} deleted`,
        description: `The ${contentType} has been deleted and a warning has been sent to the author.`,
      })

      setDeleteDialogOpen(false)
      setWarningReason('')
      setWarningMessage('')
      router.refresh()
      setOpen(false)
    } catch (error) {
      console.error(`Error deleting ${reportType} with warning:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to delete ${reportType}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBanUser = async () => {
    if (!chatMessage?._id || !chatMessage?.author?._id || !chatMessage?.chatGroup?._id) {
      toast({
        title: "Error",
        description: "Chat message, author, or chat group information is missing.",
        variant: "destructive",
      })
      return
    }

    try {
      const chatGroup = chatMessage.chatGroup
      const chatGroupId = (typeof chatGroup === 'object' && chatGroup && '_id' in chatGroup)
        ? String(chatGroup._id)
        : String(chatGroup || '')
      
      const authorId = chatMessage.author._id
      const bannedUserId = (typeof authorId === 'object' && authorId)
        ? String(authorId)
        : String(authorId || '')

      setIsBanning(true)

      const response = await fetch('/api/chat/groups/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatGroupId,
          bannedUserId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ban user from chat group')
      }

      toast({
        title: "User banned",
        description: "The user has been banned from the chat group.",
      })

      // Update report status to resolved
      await handleStatusUpdate('resolved')
      router.refresh()
      setOpen(false)
    } catch (error) {
      console.error('Error banning user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to ban user from chat group',
        variant: "destructive",
      })
    } finally {
      setIsBanning(false)
    }
  }

  // Safely extract content and reporter with null checks
  const question = (report?.question && report.question !== null && typeof report.question === 'object' && report.question._id) ? report.question : null
  const answer = (report?.answer && report.answer !== null && typeof report.answer === 'object' && report.answer._id) ? report.answer : null
  const comment = (report?.comment && report.comment !== null && typeof report.comment === 'object' && report.comment._id) ? report.comment : null
  const chatMessage = (report?.chatMessage && report.chatMessage !== null && typeof report.chatMessage === 'object' && report.chatMessage._id) ? report.chatMessage : null
  const reporter = (report?.reporter && report.reporter !== null && typeof report.reporter === 'object' && report.reporter._id) ? report.reporter : null
  const reportType = report?.type || 'question'

  return (
    <>
      <div className="background-light900_dark200 light-border flex flex-col gap-4 rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(report?.status || 'pending')}>
                {(report?.status || 'pending').charAt(0).toUpperCase() + (report?.status || 'pending').slice(1)}
              </Badge>
              <span className="text-sm text-dark400_light700">
                Reported by{' '}
                {reporter?.clerkId ? (
                  <Link
                    href={`/profile/${reporter?.clerkId || ''}`}
                    className="text-primary-500 hover:underline"
                  >
                    {reporter?.name || 'Unknown user'}
                  </Link>
                ) : (
                  <span className="text-dark400_light700">Unknown user</span>
                )}
              </span>
              <Badge variant="outline" className="ml-2">
                {reportType === 'question' ? 'Question' : reportType === 'answer' ? 'Answer' : reportType === 'comment' ? 'Comment' : 'Chat Message'}
              </Badge>
            </div>
            {reportType === 'question' && question?._id ? (
              <Link
                href={`/question/${question?._id || ''}`}
                className="h3-semibold text-dark200_light900 hover:text-primary-500 transition-colors"
              >
                {question?.title || 'Untitled'}
              </Link>
            ) : reportType === 'answer' && answer?._id ? (
              <div>
                <Link
                  href={answer?.question?._id ? `/question/${answer.question._id}` : '#'}
                  className="h3-semibold text-dark200_light900 hover:text-primary-500 transition-colors"
                >
                  {answer?.question?.title || 'Question'}
                </Link>
                {answer?.content && (
                  <div className="mt-2 p-3 bg-light-800 dark:bg-dark-400 rounded-md border border-light-700 dark:border-dark-500">
                    <p className="text-xs font-semibold text-dark400_light700 mb-1">Answer Preview:</p>
                    <div className="text-sm text-dark200_light900 line-clamp-3">
                      <ParseHTML data={answer.content.substring(0, 200)} />
                    </div>
                  </div>
                )}
              </div>
            ) : reportType === 'comment' && comment?._id ? (
              <div>
                <Link
                  href={comment?.answer?.question?._id ? `/question/${comment.answer.question._id}` : '#'}
                  className="h3-semibold text-dark200_light900 hover:text-primary-500 transition-colors"
                >
                  {comment?.answer?.question?.title || 'Question'}
                </Link>
                {comment?.content && (
                  <div className="mt-2 p-3 bg-light-800 dark:bg-dark-400 rounded-md border border-light-700 dark:border-dark-500">
                    <p className="text-xs font-semibold text-dark400_light700 mb-1">Comment Preview:</p>
                    <p className="text-sm text-dark200_light900 line-clamp-3 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                )}
              </div>
            ) : reportType === 'chatMessage' && chatMessage?._id ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h3-semibold text-dark200_light900">
                    Chat Group: {chatMessage?.chatGroup?.name || 'Unknown Group'}
                  </span>
                </div>
                {chatMessage?.content && (
                  <div className="mt-2 p-3 bg-light-800 dark:bg-dark-400 rounded-md border border-light-700 dark:border-dark-500">
                    <div className="flex items-center gap-2 mb-2">
                      <Image
                        src={chatMessage?.author?.picture || '/assets/icons/avatar.svg'}
                        alt={chatMessage?.author?.name || 'User'}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span className="text-xs font-semibold text-dark400_light700">
                        {chatMessage?.author?.name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-dark400_light700">
                        <ClientTimestamp createdAt={chatMessage.createdAt} />
                      </span>
                    </div>
                    <p className="text-sm text-dark200_light900 whitespace-pre-wrap break-words">
                      {chatMessage.content}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h3-semibold text-dark400_light700">
                {reportType === 'question' ? 'Question' : reportType === 'answer' ? 'Answer' : reportType === 'comment' ? 'Comment' : 'Chat Message'} has been deleted
              </div>
            )}
            <p className="text-sm text-dark400_light700 mt-2 line-clamp-2">
              <strong>Reason:</strong> {report.reason}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-dark400_light700">
              <span>
                Reported <ClientTimestamp createdAt={report.createdAt} />
              </span>
              {report.reviewedAt && (
                <span>
                  Reviewed <ClientTimestamp createdAt={report.reviewedAt} />
                </span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
          >
            View Details
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Review the report and take appropriate action
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-dark400_light700 mb-2">Report Status</h3>
              <Badge className={getStatusColor(report.status)}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-dark400_light700 mb-2">Reported By</h3>
              {reporter?.clerkId ? (
                <>
                  <Link
                    href={`/profile/${reporter?.clerkId || ''}`}
                    className="flex items-center gap-2 hover:text-primary-500"
                  >
                    <Image
                      src={reporter?.picture || '/assets/images/default-avatar.png'}
                      alt={reporter?.name || 'Unknown user'}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                    <span>{reporter?.name || 'Unknown user'}</span>
                  </Link>
                </>
              ) : (
                <span className="text-dark400_light700">Unknown user</span>
              )}
              <p className="text-sm text-dark400_light700 mt-1">
                Reported <ClientTimestamp createdAt={report.createdAt} />
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-dark400_light700 mb-2">Reason for Reporting</h3>
              <p className="text-dark200_light900">{report.reason}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-dark400_light700 mb-2">
                {reportType === 'chatMessage' ? 'Chat Message' : reportType === 'question' ? 'Question' : reportType === 'answer' ? 'Answer' : 'Comment'} Details
              </h3>
              {reportType === 'chatMessage' && chatMessage?._id ? (
                <>
                  <div className="mb-3">
                    <span className="text-sm font-semibold text-dark400_light700">Chat Group: </span>
                    <span className="text-sm text-dark200_light900">
                      {chatMessage?.chatGroup?.name || 'Unknown Group'}
                    </span>
                  </div>
                  {chatMessage?.author ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Image
                        src={chatMessage.author?.picture || '/assets/images/default-avatar.png'}
                        alt={chatMessage.author?.name || 'Unknown'}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <Link
                        href={`/profile/${chatMessage.author?.clerkId || ''}`}
                        className="text-sm text-primary-500 hover:underline"
                      >
                        {chatMessage.author?.name || 'Unknown'}
                      </Link>
                      <span className="text-sm text-dark400_light700">
                        • <ClientTimestamp createdAt={chatMessage?.createdAt || new Date()} />
                      </span>
                    </div>
                  ) : null}
                  {chatMessage?.content ? (
                    <div className="bg-light-800 dark:bg-dark-400 rounded-lg p-4 border border-light-700 dark:border-dark-500 mt-3">
                      <p className="text-xs font-semibold text-dark400_light700 mb-2">Message Content:</p>
                      <div className="text-dark200_light900">
                        <p className="whitespace-pre-wrap break-words">{chatMessage.content}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark400_light700 italic mt-3">This chat message has been deleted.</p>
                  )}
                </>
              ) : reportType === 'question' && question?._id ? (
                <>
                  <Link
                    href={`/question/${question?._id || ''}`}
                    className="h4-semibold text-dark200_light900 hover:text-primary-500 block mb-2"
                  >
                    {question?.title || 'Untitled'}
                  </Link>
                  {question?.author ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Image
                        src={question.author?.picture || '/assets/images/default-avatar.png'}
                        alt={question.author?.name || 'Unknown'}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <Link
                        href={`/profile/${question.author?.clerkId || ''}`}
                        className="text-sm text-primary-500 hover:underline"
                      >
                        {question.author?.name || 'Unknown'}
                      </Link>
                      <span className="text-sm text-dark400_light700">
                        • <ClientTimestamp createdAt={question?.createdAt || new Date()} />
                      </span>
                    </div>
                  ) : null}
                  <div className="text-dark200_light900">
                    <ParseHTML data={question?.content || ''} />
                  </div>
                </>
              ) : reportType === 'answer' && answer?._id ? (
                <>
                  {answer?.question?._id && (
                    <Link
                      href={`/question/${answer.question._id}`}
                      className="h4-semibold text-dark200_light900 hover:text-primary-500 block mb-2"
                    >
                      {answer.question.title || 'Question'}
                    </Link>
                  )}
                  {answer?.author ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Image
                        src={answer.author?.picture || '/assets/images/default-avatar.png'}
                        alt={answer.author?.name || 'Unknown'}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <Link
                        href={`/profile/${answer.author?.clerkId || ''}`}
                        className="text-sm text-primary-500 hover:underline"
                      >
                        {answer.author?.name || 'Unknown'}
                      </Link>
                      <span className="text-sm text-dark400_light700">
                        • <ClientTimestamp createdAt={answer?.createdAt || new Date()} />
                      </span>
                    </div>
                  ) : null}
                  {answer?.content ? (
                    <div className="bg-light-800 dark:bg-dark-400 rounded-lg p-4 border border-light-700 dark:border-dark-500 mt-3">
                      <p className="text-xs font-semibold text-dark400_light700 mb-2">Answer Content:</p>
                      <div className="text-dark200_light900">
                        <ParseHTML data={answer.content} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark400_light700 italic mt-3">Content has been deleted</p>
                  )}
                </>
              ) : reportType === 'comment' && comment?._id ? (
                <>
                  {comment?.answer?.question?._id && (
                    <Link
                      href={`/question/${comment.answer.question._id}`}
                      className="h4-semibold text-dark200_light900 hover:text-primary-500 block mb-2"
                    >
                      {comment.answer.question.title || 'Question'}
                    </Link>
                  )}
                  {comment?.author ? (
                    <div className="flex items-center gap-2 mb-3">
                      <Image
                        src={comment.author?.picture || '/assets/images/default-avatar.png'}
                        alt={comment.author?.name || 'Unknown'}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <Link
                        href={`/profile/${comment.author?.clerkId || ''}`}
                        className="text-sm text-primary-500 hover:underline"
                      >
                        {comment.author?.name || 'Unknown'}
                      </Link>
                      <span className="text-sm text-dark400_light700">
                        • <ClientTimestamp createdAt={comment?.createdAt || new Date()} />
                      </span>
                    </div>
                  ) : null}
                  {comment?.content ? (
                    <div className="bg-light-800 dark:bg-dark-400 rounded-lg p-4 border border-light-700 dark:border-dark-500 mt-3">
                      <p className="text-xs font-semibold text-dark400_light700 mb-2">Comment Content:</p>
                      <div className="text-dark200_light900">
                        <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-dark400_light700 italic mt-3">Content has been deleted</p>
                  )}
                </>
              ) : (
                <p className="text-dark400_light700 italic">
                  This {reportType === 'chatMessage' ? 'chat message' : reportType === 'question' ? 'question' : reportType === 'answer' ? 'answer' : 'comment'} has been deleted.
                </p>
              )}
            </div>

            {report.reviewedBy && (
              <div>
                <h3 className="text-sm font-semibold text-dark400_light700 mb-2">Reviewed By</h3>
                <div className="flex items-center gap-2">
                  <span>{report.reviewedBy.name}</span>
                  {report.reviewedAt && (
                    <span className="text-sm text-dark400_light700">
                      on <ClientTimestamp createdAt={report.reviewedAt} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isUpdating}
            >
              Close
            </Button>
            {report.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('reviewed')}
                  disabled={isUpdating}
                >
                  Mark as Reviewed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={isUpdating}
                >
                  Mark as Resolved
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('dismissed')}
                  disabled={isUpdating}
                >
                  Dismiss
                </Button>
              </>
            )}
            {report.status === 'reviewed' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={isUpdating}
                >
                  Mark as Resolved
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('dismissed')}
                  disabled={isUpdating}
                >
                  Dismiss
                </Button>
              </>
            )}
            {(question?._id || answer?._id || comment?._id) && (
              <Link href={
                question?._id 
                  ? `/question/${question._id}` 
                  : answer?.question?._id 
                    ? `/question/${answer.question._id}` 
                    : comment?.answer?.question?._id
                      ? `/question/${comment.answer.question._id}`
                      : '#'
              }>
                <Button variant="default">
                  View {reportType === 'question' ? 'Question' : reportType === 'answer' ? 'Answer' : 'Comment'}
                </Button>
              </Link>
            )}
            {chatMessage?._id && chatMessage?.chatGroup?._id && (
              <Link href="/chat">
                <Button variant="default">
                  View Chat Group
                </Button>
              </Link>
            )}
            {(question?._id || answer?._id || comment?._id) && (
              <Button
                variant="destructive"
                onClick={() => {
                  setOpen(false)
                  setDeleteDialogOpen(true)
                }}
                disabled={isUpdating}
              >
                Delete & Warn {reportType === 'question' ? 'Author' : reportType === 'answer' ? 'Author' : 'Author'}
              </Button>
            )}
            {chatMessage?._id && chatMessage?.author?._id && (
              <Button
                variant="destructive"
                onClick={handleBanUser}
                disabled={isBanning || isUpdating}
              >
                {isBanning ? 'Banning...' : 'Ban User from Chat Group'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete with Warning Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Delete {reportType === 'question' ? 'Question' : reportType === 'answer' ? 'Answer' : 'Comment'} and Issue Warning</DialogTitle>
            <DialogDescription>
              This will permanently delete the {reportType} and send a warning notification to the author. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Deletion *</Label>
              <Textarea
                id="reason"
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                placeholder="e.g., Inappropriate content, Spam, Violates community guidelines"
                rows={3}
                required
                disabled={isDeleting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Warning Message to Author *</Label>
              <Textarea
                id="message"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="Write a clear warning message that will be sent to the question author..."
                rows={5}
                required
                disabled={isDeleting}
              />
              <p className="text-sm text-dark-400 dark:text-light-700">
                This message will be displayed to the author when they log in.
              </p>
            </div>
            {(question?._id || answer?._id || comment?._id) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                {reportType === 'question' && question?._id && (
                  <>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Question:</strong> {question?.title || 'Untitled'}
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      <strong>Author:</strong> {question?.author?.name || 'Unknown'}
                    </p>
                  </>
                )}
                {reportType === 'answer' && answer?._id && (
                  <>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Answer:</strong> {answer?.content?.substring(0, 100) || 'Content'}...
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      <strong>Author:</strong> {answer?.author?.name || 'Unknown'}
                    </p>
                    {answer?.question?.title && (
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        <strong>Question:</strong> {answer.question.title}
                      </p>
                    )}
                  </>
                )}
                {reportType === 'comment' && comment?._id && (
                  <>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Comment:</strong> {comment?.content?.substring(0, 100) || 'Content'}...
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      <strong>Author:</strong> {comment?.author?.name || 'Unknown'}
                    </p>
                    {comment?.answer?.question?.title && (
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        <strong>Question:</strong> {comment.answer.question.title}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setWarningReason('')
                setWarningMessage('')
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWithWarning}
              disabled={isDeleting || !warningReason.trim() || !warningMessage.trim() || (!question?._id && !answer?._id && !comment?._id)}
            >
              {isDeleting ? 'Deleting...' : 'Delete & Send Warning'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
