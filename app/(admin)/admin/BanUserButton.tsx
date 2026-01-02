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
import { Badge } from '@/components/ui/badge'
import { banUser, unbanUser } from './_actions'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface BanUserButtonProps {
  clerkId: string
  userName: string
  isBanned: boolean
}

export function BanUserButton({ clerkId, userName, isBanned }: BanUserButtonProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  async function handleBan() {
    setIsProcessing(true)

    const formData = new FormData()
    formData.append('clerkId', clerkId)

    const result = isBanned 
      ? await unbanUser(formData)
      : await banUser(formData)

    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `User ${userName} has been ${isBanned ? 'unbanned' : 'banned'}`,
      })
      setOpen(false)
      router.refresh()
    }

    setIsProcessing(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isBanned ? "default" : "destructive"} 
          size="sm" 
          className="w-full sm:w-auto relative"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          {isBanned ? 'Unban' : 'Ban'}
        </Button>
      </DialogTrigger>
      <DialogContent className="background-light900_dark300">
        <DialogHeader>
          <DialogTitle>{isBanned ? 'Unban User' : 'Ban User'}</DialogTitle>
          <DialogDescription>
            Are you sure you want to {isBanned ? 'unban' : 'ban'} <strong>{userName}</strong>? 
            {!isBanned && ' This will permanently prevent the user from accessing the platform. This action can be reversed by unbanning the user.'}
            {isBanned && ' This will restore the user\'s access to the platform.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isBanned ? "default" : "destructive"}
            onClick={handleBan}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : (isBanned ? 'Unban User' : 'Ban User')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
