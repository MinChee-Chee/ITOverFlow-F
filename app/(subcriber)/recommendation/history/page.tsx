"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Protect, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FaHistory, FaRobot, FaUser, FaCopy, FaEye, FaComment, FaArrowUp, FaSpinner } from "react-icons/fa"
import { IoMdArrowBack, IoMdRefresh } from "react-icons/io"
import { formatAndDivideNumber, getDeviconClassName, calculateSimilarityFromDistance } from "@/lib/utils"
import { useRouter } from "next/navigation"
import ClientTimestamp from "@/components/shared/ClientTimestamp"

type HistoryItem = {
  id: string
  query: string
  topK: number
  resultIds: string[]
  distances?: number[]
  createdAt: string
}

type ChatMessage = {
  id: string
  type: "user" | "assistant"
  content: string
  results?: {
    ids: string[]
    distances?: number[]
    metadatas?: Array<{
      title?: string
      content?: string
      tags?: Array<{ _id: string; name: string }>
      views?: number
      upvotes?: number
      answers?: number
      createdAt?: string | Date
    }>
  }
  timestamp: Date
}

export default function RecommendationHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isPrivileged, setIsPrivileged] = useState(false)
  const [roleLoading, setRoleLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const hasRedirected = useRef(false)
  const hasCheckedRole = useRef(false)

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    setHistoryError(null)
    try {
      const res = await fetch("/api/recommendation/history?limit=500", {
        cache: 'no-store', // Ensure fresh data
      })
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text().catch(() => '')
        console.error("Received non-JSON response from /api/recommendation/history:", contentType, text.substring(0, 200))
        throw new Error(`Server returned ${contentType || 'non-JSON'} response. Please try again.`)
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch history (${res.status})`)
      }
      const data = await res.json()
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format")
      }
      setHistory(data)
      
      // Collect all question IDs from all history items
      const allQuestionIds: string[] = []
      data.forEach((item: HistoryItem) => {
        if (item && Array.isArray(item.resultIds)) {
          allQuestionIds.push(...item.resultIds.slice(0, 20)) // Limit per item
        }
      })
      
      // Remove duplicates
      const uniqueQuestionIds = Array.from(new Set(allQuestionIds))
      
      // Fetch all question details in one batch
      let questionDetailsMap: Record<string, {
        title?: string
        content?: string
        tags?: Array<{ _id: string; name: string }>
        views?: number
        upvotes?: number
        answers?: number
        createdAt?: string | Date
      }> = {}
      
      if (uniqueQuestionIds.length > 0) {
        try {
          // Fetch in batches of 50 to avoid URL length limits
          const batchSize = 50
          const batches = []
          for (let i = 0; i < uniqueQuestionIds.length; i += batchSize) {
            batches.push(uniqueQuestionIds.slice(i, i + batchSize))
          }
          
          const batchPromises = batches.map(async (batch) => {
            try {
              // Add timeout to prevent hanging requests
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
              
              const questionRes = await fetch("/api/recommendation/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: batch }),
                signal: controller.signal,
              })
              
              clearTimeout(timeoutId)
              
              // Check if response is JSON before parsing
              const questionContentType = questionRes.headers.get('content-type')
              if (!questionContentType || !questionContentType.includes('application/json')) {
                console.warn(`Received non-JSON response from /api/recommendation/questions: ${questionContentType}`)
                return []
              }
              
              if (!questionRes.ok) {
                console.warn(`Failed to fetch question batch: ${questionRes.status}`)
                return []
              }

              const responseData = await questionRes.json().catch(() => ({}))
              const { questions } = responseData || {}
              return Array.isArray(questions) ? questions : []
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') {
                console.warn("Question batch fetch timed out")
              } else {
                console.warn("Failed to fetch question batch:", err)
              }
            }
            return []
          })
          
          const batchResults = await Promise.all(batchPromises)
          // Flatten all questions from all batches and build a map by _id
          batchResults.flat().forEach((question: any) => {
            if (question && question._id) {
              questionDetailsMap[question._id] = {
                title: question.title,
                content: question.content,
                tags: question.tags,
                views: question.views,
                upvotes: question.upvotes,
                answers: question.answers,
                createdAt: question.createdAt,
              }
            }
          })
        } catch (err) {
          console.warn("Failed to fetch question details:", err)
        }
      }
      
      // Convert history to chat messages
      const historyMessages: ChatMessage[] = []
      
      for (const item of data) {
        if (!item || !item.id || !item.query) continue
        
        // Add user message
        historyMessages.push({
          id: `user-${item.id}`,
          type: "user",
          content: item.query || "",
          timestamp: new Date(item.createdAt || Date.now()),
        })
        
        // Map question details for this item's results
        const resultMetadatas = (Array.isArray(item.resultIds) ? item.resultIds : []).map((id: string) => {
          return questionDetailsMap[id] || {}
        })
        
        // Add assistant message with results
        const resultIds = Array.isArray(item.resultIds) ? item.resultIds : []
        historyMessages.push({
          id: `assistant-${item.id}`,
          type: "assistant",
          content: `Found ${resultIds.length} recommendation${resultIds.length !== 1 ? "s" : ""}`,
          results: {
            ids: resultIds,
            distances: Array.isArray(item.distances) ? item.distances : undefined,
            metadatas: resultMetadatas,
          },
          timestamp: new Date(item.createdAt || Date.now()),
        })
      }
      
      // Sort by timestamp
      historyMessages.sort((a, b) => {
        const timeA = a.timestamp instanceof Date && !isNaN(a.timestamp.getTime()) ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp instanceof Date && !isNaN(b.timestamp.getTime()) ? b.timestamp.getTime() : 0;
        return timeA - timeB;
      })
      setMessages(historyMessages)
    } catch (err) {
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
          console.error("Error checking role for recommendation history access:", error)
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
    // Require signed-in user to fetch history (all users can see their own history)
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
          <Link href="/recommendation">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <IoMdArrowBack className="h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
          <div>
            <h1 className="h2-bold text-dark100_light900 flex items-center gap-2">
              <FaHistory className="h-5 w-5 text-primary-500" />
              Recommendation History
            </h1>
            <p className="text-sm text-dark500_light700 mt-1">
              View all your past recommendation queries
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
            <FaSpinner className="h-4 w-4 animate-spin" />
          ) : (
            <IoMdRefresh className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-light-50 dark:bg-dark-400 mt-8">
        {isLoadingHistory && messages.length === 0 && (
          <div className="flex flex-col justify-center items-center py-16">
            <FaSpinner className="h-10 w-10 animate-spin text-primary-500 mb-4" />
            <p className="text-dark500_light700 text-sm">Loading your recommendation history...</p>
          </div>
        )}

        {historyError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-auto max-w-md">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{historyError}</p>
          </div>
        )}

        {messages.length === 0 && !isLoadingHistory && !historyError && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-6">
              <FaHistory className="h-10 w-10 text-primary-500" />
            </div>
            <p className="text-dark100_light900 text-2xl font-bold mb-3">No history yet</p>
            <p className="text-dark500_light700 text-sm mb-8 max-w-md">
              Start asking for recommendations to see your query history here. Your past searches will be saved for easy access.
            </p>
            <Link href="/recommendation">
              <Button className="bg-primary-500 hover:bg-primary-400 px-6">
                Go to Recommendations
              </Button>
            </Link>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 mt-2 items-start ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "assistant" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                <FaRobot className="h-5 w-5 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[85%] rounded-xl p-4 shadow-sm ${
                message.type === "user"
                  ? "bg-primary-500 text-white"
                  : "bg-light-800 dark:bg-dark-300 text-dark200_light900 border border-light-700 dark:border-dark-400"
              }`}
            >
              <p className="text-sm font-medium mb-2">{message.content}</p>
              
              {message.type === "assistant" && message.results && Array.isArray(message.results.ids) && message.results.ids.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {message.results.ids.map((id, idx) => {
                    if (!id) return null
                    const results = message.results!
                    const metadata = results.metadatas?.[idx] || {}
                    
                    // Extract title with proper fallbacks
                    let title = `Result ${idx + 1}`
                    if (metadata.title && typeof metadata.title === 'string' && metadata.title.trim()) {
                      title = metadata.title.trim()
                    } else if (metadata.content && typeof metadata.content === 'string' && metadata.content.trim()) {
                      title = metadata.content.substring(0, 80).trim() + (metadata.content.length > 80 ? "..." : "")
                    }
                    
                    const contentPreview = metadata.content || ""
                    
                    // Calculate similarity percentage using improved algorithm
                    const distance = results.distances?.[idx]
                    const similarity = calculateSimilarityFromDistance(
                      distance,
                      results.distances
                    )
                    
                    // Round to 1 decimal place for display
                    const displaySimilarity = similarity !== null 
                      ? Math.round(similarity * 10) / 10 
                      : null
                    
                    const questionHref = `/question/${id}`
                    const getQuestionUrl = () =>
                      typeof window !== "undefined"
                        ? `${window.location.origin}${questionHref}`
                        : questionHref
                    
                    return (
                      <Link
                        key={`${id}-${idx}`}
                        href={questionHref}
                        className="bg-white dark:bg-dark-200 rounded-xl p-5 border border-light-700/50 dark:border-dark-400/50 hover:border-primary-500/50 hover:shadow-lg transition-all duration-200 block group min-h-[160px] flex flex-col shadow-sm hover:shadow-xl"
                      >
                        {/* Header with Title and Similarity */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h4 className="text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 font-bold text-lg flex-1 line-clamp-2 leading-snug min-w-0">
                            {title.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
                            {displaySimilarity !== null && (
                              <span
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm min-w-[2.75rem] text-center h-fit ${
                                  displaySimilarity >= 80
                                    ? 'bg-green-500 text-white shadow-green-500/20'
                                    : displaySimilarity >= 60
                                    ? 'bg-blue-500 text-white shadow-blue-500/20'
                                    : 'bg-gray-500 text-white shadow-gray-500/20'
                                }`}
                                title={`Similarity: ${displaySimilarity.toFixed(1)}%`}
                              >
                                {displaySimilarity.toFixed(0)}%
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                copyToClipboard(getQuestionUrl(), e.currentTarget)
                              }}
                              className="p-1.5 hover:bg-light-800 dark:hover:bg-dark-300 rounded-md transition-all opacity-60 group-hover:opacity-100 flex items-center justify-center hover:scale-110"
                              title="Copy link"
                            >
                              <FaCopy className="h-3.5 w-3.5 text-dark400_light700" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Content Preview */}
                        {contentPreview && typeof contentPreview === 'string' && contentPreview.trim() && (
                          <p className="text-xs text-dark500_light700 line-clamp-2 mb-4 flex-1 leading-relaxed">
                            {contentPreview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                          </p>
                        )}
                        
                        {/* Tags and Metrics */}
                        <div className="flex items-center justify-between gap-3 flex-wrap mt-auto pt-3 border-t border-light-700/30 dark:border-dark-400/30">
                          {/* Tags */}
                          {metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                              {metadata.tags.slice(0, 2).map((tag: any) => {
                                const tagName = tag.name || tag
                                const iconClass = getDeviconClassName(tagName)
                                return (
                                  <span
                                    key={tag._id || tag}
                                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 dark:text-primary-400 whitespace-nowrap font-medium transition-colors flex items-center gap-1"
                                    title={tagName}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <i className={`${iconClass} text-xs`}></i>
                                    <span>{tagName}</span>
                                  </span>
                                )
                              })}
                              {metadata.tags.length > 2 && (
                                <span className="text-[10px] text-dark400_light700 whitespace-nowrap font-medium">+{metadata.tags.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1"></div>
                          )}

                          {/* Metrics - compact horizontal */}
                          <div className="flex items-center gap-3 text-xs text-dark400_light700 flex-shrink-0">
                            {metadata.views !== undefined && (
                              <div className="flex items-center gap-1.5 whitespace-nowrap h-5" title={`${formatAndDivideNumber(metadata.views)} views`}>
                                <FaEye className="h-4 w-4 flex-shrink-0 text-dark400_light700" />
                                <span className="font-semibold text-dark500_light700">{formatAndDivideNumber(metadata.views)}</span>
                              </div>
                            )}
                            {metadata.answers !== undefined && metadata.answers > 0 && (
                              <div className="flex items-center gap-1.5 whitespace-nowrap h-5" title={`${metadata.answers} answers`}>
                                <FaComment className="h-4 w-4 flex-shrink-0 text-dark400_light700" />
                                <span className="font-semibold text-dark500_light700">{metadata.answers}</span>
                              </div>
                            )}
                            {metadata.upvotes !== undefined && metadata.upvotes > 0 && (
                              <div className="flex items-center gap-1.5 whitespace-nowrap h-5" title={`${metadata.upvotes} upvotes`}>
                                <FaArrowUp className="h-4 w-4 flex-shrink-0 text-dark400_light700" />
                                <span className="font-semibold text-dark500_light700">{metadata.upvotes}</span>
                              </div>
                            )}
                            {metadata.createdAt && (
                              <span className="ml-auto whitespace-nowrap font-semibold text-dark500_light700 h-5 flex items-center text-[10px]">
                                {(() => {
                                  try {
                                    const date = new Date(metadata.createdAt);
                                    if (date instanceof Date && !isNaN(date.getTime())) {
                                      return (
                                        <ClientTimestamp createdAt={date} />
                                      );
                                    }
                                    return "";
                                  } catch {
                                    return "";
                                  }
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
              
              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime())
                  ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : ""}
              </span>
            </div>

            {message.type === "user" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                <FaUser className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )

  // Show history content for all signed-in users
  // The Protect component below handles premium access if needed
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
          <FaHistory className="h-10 w-10 text-primary-500" />
        </div>
        <h1 className="h2-bold text-dark100_light900 mb-3">Sign in to view history</h1>
        <p className="text-dark500_light700 max-w-md mb-6">
          Please sign in to view your recommendation history.
        </p>
        <Link href="/sign-in">
          <Button className="bg-primary-500 hover:bg-primary-400 px-6">Sign in</Button>
        </Link>
      </div>
    )
  }

  // Admins and moderators can access recommendation history without subscription
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
            <FaHistory className="h-10 w-10 text-primary-500" />
          </div>
          <h1 className="h2-bold text-dark100_light900 mb-3">History is premium</h1>
          <p className="text-dark500_light700 max-w-md mb-6">
            Sign in with an eligible plan to view your recommendation history, or upgrade to unlock this feature.
          </p>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button className="bg-primary-500 hover:bg-primary-400 px-6">View pricing</Button>
            </Link>
          </div>
        </div>
      }
    >
      {historyContent}
    </Protect>
  )
}

