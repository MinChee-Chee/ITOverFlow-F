"use client"

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import TermsAgreementDialog from '@/components/shared/TermsAgreementDialog'

export default function TermsChecker() {
  const { user, isLoaded } = useUser()
  const [showDialog, setShowDialog] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Check terms acceptance status from API
  const checkTermsStatus = useCallback(async () => {
    if (!user) {
      setTermsAccepted(false)
      setIsChecking(false)
      return false
    }

    try {
      const response = await fetch('/api/user/check-terms', {
        cache: 'no-store', // Always fetch fresh data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        const accepted = data.termsAccepted === true // Explicitly check for true
        setTermsAccepted(accepted)
        setIsChecking(false)
        return accepted
      } else {
        // API error - default to not accepted
        console.error('[TermsChecker] API error:', response.status)
        setTermsAccepted(false)
        setIsChecking(false)
        return false
      }
    } catch (error) {
      console.error('[TermsChecker] Error checking terms:', error)
      // On error - default to not accepted
      setTermsAccepted(false)
      setIsChecking(false)
      return false
    }
  }, [user?.id]) // Only depend on user.id to prevent unnecessary recreations

  // Initial check when user loads - ONLY run once when user is loaded
  useEffect(() => {
    // Don't check if user is not loaded or doesn't exist
    if (!isLoaded || !user) {
      setIsChecking(false)
      setTermsAccepted(false)
      return
    }

    let isMounted = true
    setIsChecking(true)

    // Check terms status immediately when user loads
    checkTermsStatus().then((accepted) => {
      // Only update state if component is still mounted
      if (!isMounted) return

      // Only show dialog if terms are NOT accepted
      if (!accepted) {
        // Show dialog if not on terms page, or if showTermsDialog query param is present
        const shouldShow = pathname !== '/terms-of-use' || searchParams.get('showTermsDialog') === 'true'
        if (shouldShow) {
          setShowDialog(true)
        }
      } else {
        // Terms are accepted - ensure dialog is closed and remove query param
        setShowDialog(false)
        if (searchParams.get('showTermsDialog') === 'true') {
          router.replace(pathname || '/')
        }
      }
    })

    return () => {
      isMounted = false
    }
  }, [isLoaded, user?.id]) // Only depend on isLoaded and user.id to prevent unnecessary re-runs

  // Re-check when navigating away from terms page (only if terms not accepted)
  // This ensures dialog shows if user navigates away without accepting
  useEffect(() => {
    // Skip if still checking, no user, or terms already accepted
    if (!isLoaded || !user || isChecking || termsAccepted === true) return

    // Only show dialog if navigating away from terms page and terms not accepted
    if (pathname !== '/terms-of-use' && termsAccepted === false) {
      setShowDialog(true)
    } else if (pathname === '/terms-of-use' && termsAccepted === false) {
      // On terms page, allow dialog to be closed temporarily
      setShowDialog(false)
    }
  }, [pathname, isLoaded, user, isChecking, termsAccepted])

  // Handle dialog close - re-check terms status
  const handleDialogChange = useCallback(async (open: boolean) => {
    setShowDialog(open)
    
    // If dialog is being closed, re-check terms status
    if (!open) {
      const accepted = await checkTermsStatus()
      
      if (accepted) {
        // Terms are now accepted - keep dialog closed
        setShowDialog(false)
        // Remove query parameter if present
        if (searchParams.get('showTermsDialog') === 'true') {
          router.replace(pathname || '/')
        }
      } else {
        // Terms still not accepted - re-open if not on terms page
        if (pathname !== '/terms-of-use') {
          setShowDialog(true)
        }
      }
    }
  }, [checkTermsStatus, pathname, searchParams, router])

  // NEVER render dialog if:
  // 1. Still checking
  // 2. No user
  // 3. Terms are accepted (termsAccepted === true)
  // Only render if terms are explicitly NOT accepted (termsAccepted === false)
  if (isChecking || !user || termsAccepted !== false) {
    return null
  }

  return (
    <TermsAgreementDialog
      open={showDialog}
      onOpenChange={handleDialogChange}
    />
  )
}
