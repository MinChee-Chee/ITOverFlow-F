'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'
import { Trash2 } from 'lucide-react'

interface DeleteChatGroupButtonProps {
  chatGroupId: string
  chatGroupName: string
  onGroupDeleted?: () => void
}

export default function DeleteChatGroupButton({
  chatGroupId,
  chatGroupName,
  onGroupDeleted,
}: DeleteChatGroupButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/chat/groups/${chatGroupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete chat group')
      }

      toast({
        title: 'Success',
        description: `Chat group "${chatGroupName}" has been deleted`,
      })

      setOpen(false)
      if (onGroupDeleted) {
        onGroupDeleted()
      }
    } catch (error) {
      console.error('Error deleting chat group:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete chat group',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="background-light900_dark300">
        <DialogHeader>
          <DialogTitle>Delete Chat Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{chatGroupName}</strong>? This action cannot be undone. This will delete the chat group and all associated messages.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

