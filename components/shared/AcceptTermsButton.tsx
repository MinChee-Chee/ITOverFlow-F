"use client"

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function AcceptTermsButton() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user) {
      setIsChecking(false)
      return
    }

    const checkTerms = async () => {
      try {
        const response = await fetch('/api/user/check-terms')
        if (response.ok) {
          const data = await response.json()
          setTermsAccepted(data.termsAccepted || false)
        }
      } catch (error) {
        console.error('Error checking terms:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkTerms()
  }, [isLoaded, user])

  const handleAcceptTerms = () => {
    // Navigate back to home and trigger dialog via query parameter
    router.push('/?showTermsDialog=true')
  }

  if (!isLoaded || !user || isChecking || termsAccepted) {
    return null
  }

  return (
    <div className="mt-8 flex justify-center border-t pt-6">
      <Button
        onClick={handleAcceptTerms}
        size="lg"
        className="px-8"
      >
        Accept Terms & Continue
      </Button>
    </div>
  )
}
