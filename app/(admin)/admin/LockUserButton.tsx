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
import { lockUser, unlockUser } from './_actions'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface LockUserButtonProps {
  clerkId: string
  userName: string
  isLocked: boolean
}

export function LockUserButton({ clerkId, userName, isLocked }: LockUserButtonProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  async function handleLock() {
    setIsProcessing(true)

    const formData = new FormData()
    formData.append('clerkId', clerkId)

    const result = isLocked 
      ? await unlockUser(formData)
      : await lockUser(formData)

    if (result?.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: `User ${userName} has been ${isLocked ? 'unlocked' : 'locked'}`,
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
          variant={isLocked ? "default" : "outline"} 
          size="sm" 
          className="w-full sm:w-auto"
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
            {isLocked ? (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ) : (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <circle cx="12" cy="16" r="1" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            )}
          </svg>
          {isLocked ? 'Unlock' : 'Lock'}
        </Button>
      </DialogTrigger>
      <DialogContent className="background-light900_dark300">
        <DialogHeader>
          <DialogTitle>{isLocked ? 'Unlock User' : 'Lock User'}</DialogTitle>
          <DialogDescription>
            Are you sure you want to {isLocked ? 'unlock' : 'lock'} <strong>{userName}</strong>? 
            {!isLocked && ' This will prevent the user from accessing their account.'}
            {isLocked && ' This will restore the user\'s access to their account.'}
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
            variant={isLocked ? "default" : "destructive"}
            onClick={handleLock}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : (isLocked ? 'Unlock User' : 'Lock User')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
