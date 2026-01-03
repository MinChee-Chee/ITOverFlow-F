"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Protect, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bot, User, Copy, History as HistoryIcon, ArrowLeft, RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import ClientTimestamp from "@/components/shared/ClientTimestamp"

type HistoryItem = {
  id: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    citations?: Array<{
      position: number
      references: Array<{
        pages?: number[]
        file?: {
          name?: string
          id?: string
          metadata?: Record<string, any>
        }
      }>
    }>
  }>
  model?: string  // This is the API response field name, kept as 'model' for frontend compatibility
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  createdAt: string
  updatedAt: string
}

export default function ChatAIHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isPrivileged, setIsPrivileged] = useState(false)
  const [roleLoading, setRoleLoading] = useState(true)
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const hasRedirected = useRef(false)
  const hasCheckedRole = useRef(false)

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    setHistoryError(null)
    try {
      const res = await fetch("/api/chat-ai/history?limit=100", {
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch history (${res.status})`)
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format")
      }
      setHistory(data)
    } catch (err) {
      console.error("Error fetching chat AI history:", err)
      setHistoryError(err instanceof Error ? err.message : "Failed to fetch history")
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const copyToClipboard = async (text: string, buttonElement?: HTMLElement) => {
    try {
      await navigator.clipboard.writeText(text)
      if (buttonElement) {
        const originalHTML = buttonElement.innerHTML
        buttonElement.innerHTML = '<svg class="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        setTimeout(() => {
          buttonElement.innerHTML = originalHTML
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  useEffect(() => {
    setMounted(true)
    // Reset refs on mount to ensure fresh checks on navigation
    hasCheckedRole.current = false
    hasRedirected.current = false
  }, [])

  // Handle authentication and role checking in a single, stable flow
  useEffect(() => {
    // Wait for mount and Clerk to be ready
    if (!mounted || !isLoaded) return

    // Handle unauthenticated users
    if (!isSignedIn) {
      if (!hasRedirected.current) {
        hasRedirected.current = true
        router.replace("/sign-in")
      }
      setRoleLoading(false)
      setIsPrivileged(false)
      return
    }

    // Reset and check role on each mount/navigation
    // This ensures fresh checks when navigating between pages
    hasCheckedRole.current = false
    setIsPrivileged(false)
    setRoleLoading(true)

    // Check role for privileged access
    let isCancelled = false
    const checkRole = async () => {
      try {
        const response = await fetch("/api/auth/check-role", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })
        
        // Check if cancelled before processing
        if (isCancelled) return
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn("Received non-JSON response from /api/auth/check-role:", contentType)
          if (!isCancelled) {
            setIsPrivileged(false)
            setRoleLoading(false)
          }
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          if (!isCancelled) {
            setIsPrivileged(data.isModerator === true || data.isAdmin === true)
            hasCheckedRole.current = true
          }
        } else {
          if (!isCancelled) {
            setIsPrivileged(false)
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Error checking role for chat AI history access:", error)
          setIsPrivileged(false)
        }
      } finally {
        if (!isCancelled) {
          setRoleLoading(false)
        }
      }
    }

    checkRole()
    
    // Cleanup function to cancel if component unmounts or dependencies change
    return () => {
      isCancelled = true
    }
  }, [isLoaded, isSignedIn, mounted, router])

  useEffect(() => {
    if (!mounted || !isLoaded || roleLoading) return
    if (!isSignedIn) return
    fetchHistory()
  }, [fetchHistory, isLoaded, isSignedIn, mounted, roleLoading])

  if (!mounted || !isLoaded || roleLoading) {
    return null
  }

  const historyContent = (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-6xl mx-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/chatAI">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <div>
            <h1 className="h2-bold text-dark100_light900 flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-primary-500" />
              Chat AI History
            </h1>
            <p className="text-sm text-dark500_light700 mt-1">
              View all your past conversations with the AI assistant
            </p>
          </div>
        </div>
        <Button
          onClick={fetchHistory}
          disabled={isLoadingHistory}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isLoadingHistory ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-light-50 dark:bg-dark-400 mt-8">
        {isLoadingHistory && history.length === 0 && (
          <div className="flex flex-col justify-center items-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
            <p className="text-dark500_light700 text-sm">Loading your chat history...</p>
          </div>
        )}

        {historyError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-auto max-w-md">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{historyError}</p>
          </div>
        )}

        {history.length === 0 && !isLoadingHistory && !historyError && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-6">
              <HistoryIcon className="h-10 w-10 text-primary-500" />
            </div>
            <p className="text-dark100_light900 text-2xl font-bold mb-3">No history yet</p>
            <p className="text-dark500_light700 text-sm mb-8 max-w-md">
              Start chatting with the AI assistant to see your conversation history here. Your past conversations will be saved for easy access.
            </p>
            <Link href="/chatAI">
              <Button className="bg-primary-500 hover:bg-primary-400 px-6">
                Go to Chat AI
              </Button>
            </Link>
          </div>
        )}

        {history.map((item) => (
          <div
            key={item.id}
            className="bg-light-800 dark:bg-dark-300 rounded-xl p-6 border border-light-700 dark:border-dark-400 shadow-sm"
          >
            {/* Conversation Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-light-700 dark:border-dark-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-dark100_light900">
                    Conversation
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <ClientTimestamp createdAt={item.createdAt} />
                    {item.usage?.total_tokens && (
                      <span className="text-xs text-dark400_light700">
                        • {item.usage.total_tokens} tokens
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {item.messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[85%] rounded-xl p-3 shadow-sm ${
                      message.role === "user"
                        ? "bg-primary-500 text-white"
                        : "bg-light-700 dark:bg-dark-400 text-dark200_light900 border border-light-600 dark:border-dark-500"
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-sm font-medium whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    
                    {message.role === "assistant" && (
                      <div className="flex items-center justify-end mt-2">
                        <button
                          onClick={(e) => {
                            copyToClipboard(message.content, e.currentTarget as HTMLElement)
                          }}
                          className="p-1 hover:bg-light-600 dark:hover:bg-dark-500 rounded-md transition-all opacity-60 hover:opacity-100"
                          title="Copy message"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Admins and moderators can access ChatAI history without subscription
  if (isPrivileged) {
    return historyContent
  }

  // Other users must have the required plan
  return (
    <Protect
      plan="groupchat"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
            <HistoryIcon className="h-10 w-10 text-primary-500" />
          </div>
          <h1 className="h2-bold text-dark100_light900 mb-3">Chat AI History is premium</h1>
          <p className="text-dark500_light700 max-w-md mb-6">
            Sign in with an eligible plan to access chat AI history, or upgrade to unlock this feature.
          </p>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button className="bg-primary-500 hover:bg-primary-400 px-6">View pricing</Button>
            </Link>
            {!isSignedIn && (
              <Link href="/sign-in">
                <Button variant="outline" className="px-6">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      }
    >
      {historyContent}
    </Protect>
  )
}
