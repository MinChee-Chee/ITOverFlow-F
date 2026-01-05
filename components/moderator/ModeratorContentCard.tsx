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
import ParseHTML from '@/components/shared/ParseHTML'
import { Eye, Trash2 } from 'lucide-react'
import type { ContentItem } from '@/lib/actions/moderator.action'

interface ModeratorContentCardProps {
  item: ContentItem
}

export default function ModeratorContentCard({ item }: ModeratorContentCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast({
        title: "Validation error",
        description: "Please provide a reason for deletion.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      const url = item.type === 'question'
        ? `/api/questions/${item._id}/delete-with-warning`
        : `/api/answers/${item._id}/delete-with-warning`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: deleteReason.trim(),
          message: `Your ${item.type} has been deleted by a moderator. Reason: ${deleteReason.trim()}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete ${item.type}`)
      }

      toast({
        title: `${item.type === 'question' ? 'Question' : 'Answer'} deleted`,
        description: `The ${item.type} has been deleted and a warning has been sent to the author.`,
      })

      setDeleteDialogOpen(false)
      setDeleteReason('')
      router.refresh()
    } catch (error) {
      console.error(`Error deleting ${item.type}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to delete ${item.type}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const viewUrl = item.type === 'question'
    ? `/question/${item._id}`
    : item.questionId
    ? `/question/${item.questionId}`
    : '#'

  // Strip HTML tags for preview to avoid hydration issues
  // Use consistent regex approach that works the same on server and client
  const stripHtml = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
  }

  const plainTextContent = stripHtml(item.content)
  const contentPreview = plainTextContent.length > 150
    ? plainTextContent.substring(0, 150) + '...'
    : plainTextContent

  return (
    <>
      <div className="background-light900_dark200 light-border rounded-lg border p-4 flex flex-col gap-3 h-[400px]">
        <div className="flex items-start justify-between gap-2 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={item.type === 'question' ? 'default' : 'secondary'}>
                {item.type === 'question' ? 'Question' : 'Answer'}
              </Badge>
              <Badge className="bg-primary-500 text-light-900">
                Score: {item.score}
              </Badge>
            </div>
            {item.title && (
              <h3 className="h3-semibold text-dark200_light900 line-clamp-2 mb-2">
                {item.title}
              </h3>
            )}
            <div className="text-sm text-dark400_light700 line-clamp-3 h-[60px] overflow-hidden">
              {contentPreview}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-dark400_light700 flex-shrink-0">
          <Image
            src={item.author.picture}
            alt={item.author.name}
            width={16}
            height={16}
            className="rounded-full"
          />
          <Link
            href={`/profile/${item.author.clerkId}`}
            className="hover:text-primary-500"
          >
            {item.author.name}
          </Link>
        </div>

        <div className="flex items-center gap-4 text-xs text-dark400_light700 flex-shrink-0">
          <span>👍 {item.upvotes}</span>
          <span>👎 {item.downvotes}</span>
          {item.views !== undefined && <span>👁️ {item.views}</span>}
          {item.answers !== undefined && <span>💬 {item.answers}</span>}
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-shrink-0 min-h-[24px]">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag._id}
                variant="outline"
                className="text-xs"
              >
                {tag.name}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-light-700 dark:border-dark-400 mt-auto flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <Link href={viewUrl}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete {item.type === 'question' ? 'Question' : 'Answer'}</DialogTitle>
            <DialogDescription>
              Please provide a reason for deleting this {item.type}. The author will receive a warning notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for deletion *</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Violates community guidelines, Spam, Inappropriate content..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <div className="bg-light-800 dark:bg-dark-400 rounded-lg p-3">
              <p className="text-xs font-semibold text-dark400_light700 mb-2">
                {item.type === 'question' ? 'Question' : 'Answer'} Preview:
              </p>
              {item.title && (
                <h4 className="text-sm font-semibold text-dark200_light900 mb-2">
                  {item.title}
                </h4>
              )}
              <div className="text-sm text-dark400_light700 line-clamp-4">
                <ParseHTML data={item.content.substring(0, 200)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteReason('')
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !deleteReason.trim()}
            >
              {isDeleting ? 'Deleting...' : 'Delete & Warn Author'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
