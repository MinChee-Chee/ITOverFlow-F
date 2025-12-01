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
import { deleteUserData } from './_actions'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface DeleteUserButtonProps {
  clerkId: string
  userName: string
}

export function DeleteUserButton({ clerkId, userName }: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)

    const formData = new FormData()
    formData.append('clerkId', clerkId)

    const result = await deleteUserData(formData)

    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `User ${userName} has been deleted`,
      })
      setOpen(false)
      router.refresh()
    }

    setIsDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
          <Image
            src="/assets/icons/trash.svg"
            alt="Delete"
            width={16}
            height={16}
            className="mr-2"
          />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="background-light900_dark300">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone. This will delete the user from the database and all associated data.
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
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

