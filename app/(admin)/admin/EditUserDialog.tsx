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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateUserData } from './_actions'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface User {
  _id: string
  clerkId: string
  name: string
  username: string
  email: string
  bio?: string
  location?: string
  portfolioWebsite?: string
  picture: string
  reputation?: number
  joinedAt: Date
}

interface EditUserDialogProps {
  user: User
}

export function EditUserDialog({ user }: EditUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.append('clerkId', user.clerkId)

    const result = await updateUserData(formData)

    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
      setOpen(false)
      router.refresh()
    }

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Image
            src="/assets/icons/edit.svg"
            alt="Edit"
            width={16}
            height={16}
            className="mr-2"
          />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="background-light900_dark300 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Changes will be saved to the database.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                className="bg-light-800 dark:bg-dark-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={user.username}
                required
                className="bg-light-800 dark:bg-dark-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                className="bg-light-800 dark:bg-dark-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={user.bio || ''}
                rows={3}
                className="bg-light-800 dark:bg-dark-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={user.location || ''}
                className="bg-light-800 dark:bg-dark-300"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portfolioWebsite">Portfolio Website</Label>
              <Input
                id="portfolioWebsite"
                name="portfolioWebsite"
                type="url"
                defaultValue={user.portfolioWebsite || ''}
                className="bg-light-800 dark:bg-dark-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

