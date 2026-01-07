"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, X, Bell } from 'lucide-react'
import ClientTimestamp from './ClientTimestamp'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Warning {
  _id: string
  moderator: {
    _id: string
    name: string
    username: string
    picture: string
  }
  question?: {
    _id: string
    title: string
  }
  reason: string
  message: string
  isRead: boolean
  createdAt: Date
}

export default function WarningNotification() {
  const { user, isLoaded } = useUser()
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false)
      return
    }

    const fetchWarnings = async () => {
      try {
        // Add cache: 'no-store' to ensure fresh data on each fetch
        const response = await fetch('/api/warnings', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        })
        if (response.ok) {
          const data = await response.json()
          setWarnings(data.warnings || [])
          setUnreadCount(data.unreadCount || 0)
          
          // Auto-open dialog if there are unread warnings (only once per session)
          if (data.unreadCount > 0) {
            const warningsShown = sessionStorage.getItem('warningsShown')
            if (!warningsShown) {
              // Use setTimeout to ensure state is set after render
              setTimeout(() => {
                setOpen(true)
                sessionStorage.setItem('warningsShown', 'true')
              }, 100)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching warnings:', error)
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately on mount
    fetchWarnings()
    
    // Refresh warnings periodically (every 30 seconds)
    const interval = setInterval(fetchWarnings, 30000)
    
    return () => clearInterval(interval)
  }, [isLoaded, user?.id]) // Only depend on isLoaded and user.id, not 'open'

  const handleMarkAsRead = async (warningId: string) => {
    try {
      const response = await fetch(`/api/warnings/${warningId}/read`, {
        method: 'PATCH',
      })

      if (response.ok) {
        setWarnings(prev => 
          prev.map(w => w._id === warningId ? { ...w, isRead: true } : w)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        toast({
          title: "Warning marked as read",
        })
      }
    } catch (error) {
      console.error('Error marking warning as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark warning as read",
        variant: "destructive",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadWarnings = warnings.filter(w => !w.isRead)
      await Promise.all(
        unreadWarnings.map(w => 
          fetch(`/api/warnings/${w._id}/read`, { method: 'PATCH' })
        )
      )
      
      setWarnings(prev => prev.map(w => ({ ...w, isRead: true })))
      setUnreadCount(0)
      toast({
        title: "All warnings marked as read",
      })
    } catch (error) {
      console.error('Error marking all warnings as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark warnings as read",
        variant: "destructive",
      })
    }
  }

  // Always show the icon, even while loading (but don't show badge until loaded)
  if (!isLoaded || !user) {
    return null
  }

  const unreadWarnings = warnings.filter(w => !w.isRead)

  return (
    <>
      {/* Alarm icon in navbar - always visible when user is loaded */}
      <button
        onClick={async () => {
          // Refetch warnings when opening dialog to ensure fresh data
          if (!open) {
            try {
              const response = await fetch('/api/warnings', {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
              })
              if (response.ok) {
                const data = await response.json()
                setWarnings(data.warnings || [])
                setUnreadCount(data.unreadCount || 0)
              }
            } catch (error) {
              console.error('Error fetching warnings:', error)
            }
          }
          setOpen(true)
        }}
        className="relative p-2 rounded-full hover:bg-light-800 dark:hover:bg-dark-400 transition-colors"
        aria-label={`Warnings${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        disabled={loading}
      >
        <Bell 
          className={`h-5 w-5 transition-colors ${
            loading 
              ? 'text-dark300_light700 animate-pulse'
              : unreadCount > 0 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-dark300_light700'
          }`} 
        />
        {!loading && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Warning Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Content Violation Warnings
            </DialogTitle>
            <DialogDescription>
              You have received warnings for content violations. Please review them carefully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {warnings.length === 0 ? (
              <p className="text-center text-dark-400 dark:text-light-700 py-8">
                No warnings. You're all clear! 
              </p>
            ) : (
              <>
                {unreadWarnings.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Unread Warnings ({unreadWarnings.length})
                    </p>
                    {unreadWarnings.map((warning) => (
                      <div
                        key={warning._id}
                        className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive">Unread</Badge>
                              <span className="text-sm text-dark-400 dark:text-light-700">
                                <ClientTimestamp createdAt={warning.createdAt} />
                              </span>
                            </div>
                            {warning.question && (
                              <p className="text-sm font-semibold mb-1">
                                Question: {warning.question.title}
                              </p>
                            )}
                            <p className="text-sm font-medium mb-2">
                              Reason: {warning.reason}
                            </p>
                            <p className="text-sm">{warning.message}</p>
                            <p className="text-xs text-dark-400 dark:text-light-700 mt-2">
                              Issued by: {warning.moderator.name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(warning._id)}
                            className="ml-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {warnings.filter(w => w.isRead).length > 0 && (
                  <div className="space-y-3">
                    {unreadWarnings.length > 0 && <div className="border-t pt-4 mt-4"></div>}
                    <p className="text-sm font-semibold text-dark-400 dark:text-light-700">
                      Read Warnings ({warnings.filter(w => w.isRead).length})
                    </p>
                    {warnings.filter(w => w.isRead).map((warning) => (
                      <div
                        key={warning._id}
                        className="border border-light-700 dark:border-dark-400 rounded-lg p-4 bg-light-800 dark:bg-dark-400"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">Read</Badge>
                              <span className="text-sm text-dark-400 dark:text-light-700">
                                <ClientTimestamp createdAt={warning.createdAt} />
                              </span>
                            </div>
                            {warning.question && (
                              <p className="text-sm font-semibold mb-1">
                                Question: {warning.question.title}
                              </p>
                            )}
                            <p className="text-sm font-medium mb-2">
                              Reason: {warning.reason}
                            </p>
                            <p className="text-sm">{warning.message}</p>
                            <p className="text-xs text-dark-400 dark:text-light-700 mt-2">
                              Issued by: {warning.moderator.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {unreadWarnings.length > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
              >
                Mark All as Read
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
