"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TermsDialogContent from './TermsAgreementDialogContent'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'

interface TermsAgreementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TermsAgreementDialog({
  open,
  onOpenChange,
}: TermsAgreementDialogProps) {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [termsJustAccepted, setTermsJustAccepted] = useState(false)
  const termsAcceptedRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  
  // Allow closing dialog when on terms-of-use page OR when terms are being accepted
  const isOnTermsPage = pathname === '/terms-of-use'
  const canClose = isOnTermsPage || termsJustAccepted || termsAcceptedRef.current

  // Close dialog when terms are accepted
  useEffect(() => {
    if (termsJustAccepted && open) {
      // Force close the dialog when terms are accepted
      // Use a small delay to ensure state is updated
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [termsJustAccepted, open, onOpenChange])

  const handleAccept = async () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "You must agree to the Terms of Use to continue.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/accept-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept terms')
      }

      // Verify terms were actually saved
      if (data.termsAccepted !== true) {
        throw new Error('Terms acceptance was not saved. Please try again.')
      }

      toast({
        title: "Terms Accepted",
        description: "Thank you for accepting our Terms of Use.",
      })

      // Mark that terms were just accepted - useEffect will close the dialog
      termsAcceptedRef.current = true
      setTermsJustAccepted(true)
      
      // Refresh to update the page state and trigger TermsChecker to re-check
      router.refresh()
    } catch (error) {
      console.error('Error accepting terms:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to accept terms. Please try again.',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Control dialog open state - close if terms accepted
  const dialogOpen = termsJustAccepted ? false : open

  return (
    <Dialog 
      open={dialogOpen} 
      onOpenChange={(newOpen) => {
        // Always allow closing if terms were just accepted (check both state and ref)
        if (termsJustAccepted || termsAcceptedRef.current) {
          onOpenChange(newOpen)
          return
        }
        
        // Only allow closing if on terms page
        // If trying to close (!newOpen) and not on terms page, prevent it
        if (canClose) {
          // On terms page - allow closing
          onOpenChange(newOpen)
        } else if (!newOpen) {
          // Trying to close but not on terms page - prevent closing
          // Do nothing, dialog stays open
          return
        } else {
          // Opening dialog - always allow
          onOpenChange(newOpen)
        }
      }}
    >
      <TermsDialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        canClose={canClose}
        onInteractOutside={(e) => {
          // Prevent closing by clicking outside if not on terms page
          if (!canClose) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape key if not on terms page
          if (!canClose) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Terms of Use Agreement</DialogTitle>
          <DialogDescription>
            Please review and accept our Terms of Use to continue using ITOverFlow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-dark-400 dark:text-light-700 space-y-2">
            <p>
              We've updated our Terms of Use to better serve our community. These terms cover:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>User conduct and content guidelines</li>
              <li>Chat group moderation and ban policies</li>
              <li>Intellectual property rights</li>
              <li>Code sandbox and AI service usage</li>
              <li>Privacy and data protection</li>
              <li>Account restrictions and termination policies</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full mb-4"
              onClick={() => {
                // Navigate to terms page in same tab
                router.push('/terms-of-use')
              }}
            >
              View Full Terms of Use
            </Button>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms-agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-1"
              />
              <label
                htmlFor="terms-agreement"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I have read and agree to the Terms of Use and understand that I must comply with all rules and guidelines.
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!agreed || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Accepting...' : 'Accept Terms & Continue'}
          </Button>
        </DialogFooter>
      </TermsDialogContent>
    </Dialog>
  )
}
