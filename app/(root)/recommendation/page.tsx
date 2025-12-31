"use client"

import { useEffect, useState, useRef } from "react"
import { Protect, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Send, Bot, User, X, Copy, Eye, MessageSquare, ArrowUp, Sparkles, History as HistoryIcon } from "lucide-react"
import { formatAndDivideNumber, getDeviconClassName } from "@/lib/utils"
import { useRouter } from "next/navigation"


type RecommendationResult = {
  ids: string[]
  documents?: string[]
  metadatas?: Array<{
    title?: string
    content?: string
    tags?: Array<{ _id: string; name: string }>
    views?: number
    upvotes?: number
    answers?: number
    createdAt?: string | Date
  }>
  distances?: number[]
}

type ChatMessage = {
  id: string
  type: "user" | "assistant"
  content: string
  results?: RecommendationResult
  topK?: number
  timestamp: Date
}

const SUGGESTED_QUERIES = [
  "How to implement authentication in Next.js?",
  "Best practices for database design",
  "React performance optimization techniques",
  "How to deploy applications to production?",
  "API security and authentication",
  "State management in React applications",
]

export default function RecommendationPage() {
  const [query, setQuery] = useState("")
  const [topK, setTopK] = useState(5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mounted, setMounted] = useState(false)
  const [isPrivileged, setIsPrivileged] = useState(false)
  const [roleLoading, setRoleLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const hasRedirected = useRef(false)

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  const copyToClipboard = async (text: string, buttonElement?: HTMLElement) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show a brief visual feedback
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

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery)
    // Auto-submit after a short delay
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.requestSubmit()
      }
    }, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    const trimmedQuery = query.trim()
    // Validate query length and prevent empty submissions
    if (!trimmedQuery || isLoading || trimmedQuery.length > 1000) {
      if (trimmedQuery.length > 1000) {
        setError("Query is too long. Please keep it under 1000 characters.")
      }
      return
    }

    // Prevent double submission
    setIsLoading(true)
    setError(null)

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: trimmedQuery,
      topK,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuery("")

    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content, topK }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to fetch recommendations")
      }

      const data = await res.json()
      
      // Debug logging
      console.log("Recommendation API response:", {
        idsCount: data.ids?.length || 0,
        hasDocuments: !!data.documents,
        hasMetadatas: !!data.metadatas,
        hasDistances: !!data.distances,
        sampleDistances: data.distances?.slice(0, 3), // Log first 3 distances for debugging
      })
      
      // Ensure we have valid results structure
      if (!data || !Array.isArray(data.ids)) {
        console.error("Invalid response format:", data)
        throw new Error("Invalid response format from server")
      }
      
      const resultCount = data.ids?.length || 0
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: resultCount > 0 
          ? `Found ${resultCount} recommendation${resultCount !== 1 ? "s" : ""}`
          : "No recommendations found. Try rephrasing your query.",
        results: resultCount > 0 ? data : undefined,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      // Don't fetch history after submitting - it causes duplicates
      // History is only loaded on initial page load
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to get recommendations"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }


  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // Avoid hydration mismatches by waiting for client mount
    setMounted(true)
    // Don't load history - recommendation page always starts empty
    // History is only shown on the dedicated history page
  }, [])

  useEffect(() => {
    if (!mounted || !isLoaded || hasRedirected.current) return
    if (!isSignedIn) {
      hasRedirected.current = true
      router.replace("/sign-in")
      return
    }
  }, [isLoaded, isSignedIn, mounted, router])

  useEffect(() => {
    if (!mounted || !isLoaded) return

    const checkRole = async () => {
      try {
        const response = await fetch("/api/auth/check-role")
        if (response.ok) {
          const data = await response.json()
          if (data.isModerator || data.isAdmin) {
            setIsPrivileged(true)
          }
        }
      } catch (error) {
        console.error("Error checking role for recommendation access:", error)
      } finally {
        setRoleLoading(false)
      }
    }

    checkRole()
  }, [isLoaded, mounted])

  if (!mounted || !isLoaded || roleLoading) {
    return null
  }

  const recommendationContent = (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto rounded-lg overflow-hidden shadow-sm border border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200">
      {/* Header */}
      <div className="px-6 py-5 border-b border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="h2-bold text-dark100_light900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            Recommendation Chat
          </h1>
          <p className="text-sm text-dark500_light700 mt-1">
            Ask for recommendations using AI-powered similarity analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/recommendation/history">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <HistoryIcon className="h-4 w-4" />
              View History
            </Button>
          </Link>
          {messages.length > 0 && (
            <Button
              onClick={clearChat}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear Chat
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-light-50 dark:bg-dark-400 mt-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-6">
              <Bot className="h-10 w-10 text-primary-500" />
            </div>
            <p className="text-dark100_light900 text-2xl font-bold mb-3">Start a conversation</p>
            <p className="text-dark500_light700 text-sm mb-8 max-w-md">
              Ask for recommendations and I'll find similar content using AI-powered similarity analysis
            </p>
            <div className="w-full max-w-2xl">
              <p className="text-sm text-dark400_light700 mb-4 font-semibold">Suggested queries:</p>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {SUGGESTED_QUERIES.map((suggestedQuery, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuery(suggestedQuery)}
                    className="px-4 py-2.5 text-sm rounded-lg border border-light-700 dark:border-dark-400 bg-light-800 dark:bg-dark-300 text-dark200_light900 hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all shadow-sm hover:shadow-md"
                  >
                    {suggestedQuery}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 items-start ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.type === "assistant" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                <Bot className="h-5 w-5 text-white" />
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
              
              {message.type === "assistant" && message.results && message.results.ids.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {message.results.ids.map((id, idx) => {
                    const results = message.results!
                    const metadata = results.metadatas?.[idx] || {}
                    
                    // Extract title with proper fallbacks - prioritize MongoDB title
                    let title = `Result ${idx + 1}`
                    if (metadata.title && typeof metadata.title === 'string' && metadata.title.trim()) {
                      title = metadata.title.trim()
                    } else if (metadata.content && typeof metadata.content === 'string' && metadata.content.trim()) {
                      // Use content preview if no title
                      title = metadata.content.substring(0, 80).trim() + (metadata.content.length > 80 ? "..." : "")
                    } else if (results.documents?.[idx] && typeof results.documents[idx] === 'string' && results.documents[idx].trim()) {
                      title = results.documents[idx].substring(0, 80).trim() + (results.documents[idx].length > 80 ? "..." : "")
                    }
                    
                    // Extract content preview
                    const contentPreview = metadata.content || results.documents?.[idx] || ""
                    
                    // Calculate similarity percentage
                    const distance = results.distances?.[idx]
                    let similarity: number | null = null
                    
                    if (distance !== undefined && distance !== null && !isNaN(distance)) {
                      if (distance < 0) {
                        similarity = Math.max(0, Math.min(100, (1 + distance) * 100))
                      } else {
                        if (distance <= 2) {
                          similarity = Math.max(0, Math.min(100, (1 - distance / 2) * 100))
                        } else {
                          similarity = Math.max(0, Math.min(100, 100 * Math.exp(-distance / 2)))
                        }
                      }
                    }
                    
                    const questionUrl = typeof window !== 'undefined' ? `${window.location.origin}/question/${id}` : `/question/${id}`
                    
                    return (
                      <Link
                        key={id + idx}
                        href={`/question/${id}`}
                        className="bg-white dark:bg-dark-200 rounded-xl p-5 border border-light-700/50 dark:border-dark-400/50 hover:border-primary-500/50 hover:shadow-lg transition-all duration-200 block group min-h-[160px] flex flex-col shadow-sm hover:shadow-xl"
                      >
                        {/* Header with Title and Similarity */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h4 className="text-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 font-bold text-lg flex-1 line-clamp-2 min-w-0 leading-snug">
                            {title.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0 self-start" onClick={(e) => e.stopPropagation()}>
                            {similarity !== null && (
                              <span 
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm min-w-[2.75rem] text-center h-fit ${
                                  similarity >= 80 
                                    ? 'bg-green-500 text-white dark:bg-green-600 shadow-green-500/20'
                                    : similarity >= 60
                                    ? 'bg-blue-500 text-white dark:bg-blue-600 shadow-blue-500/20'
                                    : 'bg-gray-500 text-white dark:bg-gray-600 shadow-gray-500/20'
                                }`}
                                title={`Similarity: ${similarity.toFixed(1)}%`}
                              >
                                {similarity.toFixed(0)}%
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                copyToClipboard(questionUrl, e.currentTarget)
                              }}
                              className="p-1.5 hover:bg-light-800 dark:hover:bg-dark-300 rounded-md transition-all opacity-60 group-hover:opacity-100 flex items-center justify-center hover:scale-110"
                              title="Copy link"
                            >
                              <Copy className="h-3.5 w-3.5 text-dark400_light700" />
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
                                <Eye className="h-4 w-4 flex-shrink-0 text-dark400_light700" />
                                <span className="font-semibold text-dark500_light700">{formatAndDivideNumber(metadata.views)}</span>
                              </div>
                            )}
                            {metadata.answers !== undefined && metadata.answers > 0 && (
                              <div className="flex items-center gap-1.5 whitespace-nowrap h-5" title={`${metadata.answers} answers`}>
                                <MessageSquare className="h-4 w-4 flex-shrink-0 text-dark400_light700" />
                                <span className="font-semibold text-dark500_light700">{metadata.answers}</span>
                              </div>
                            )}
                            {metadata.upvotes !== undefined && metadata.upvotes > 0 && (
                              <div className="flex items-center gap-1.5 whitespace-nowrap h-5" title={`${metadata.upvotes} upvotes`}>
                                <ArrowUp className="h-4 w-4 flex-shrink-0 text-dark400_light700" />
                                <span className="font-semibold text-dark500_light700">{metadata.upvotes}</span>
                              </div>
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
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-light-800 dark:bg-dark-300 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                <span className="text-sm text-dark400_light700">Searching...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-16 rounded-lg border border-light-700 dark:border-dark-400 bg-light-800 dark:bg-dark-300 p-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              title="Number of results"
            />
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  e.stopPropagation()
                  const form = e.currentTarget.closest('form')
                  if (form && !isLoading && query.trim()) {
                    form.requestSubmit()
                  }
                }
              }}
              rows={1}
              className="flex-1 rounded-lg border border-light-700 dark:border-dark-400 bg-light-800 dark:bg-dark-300 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-dark200_light900 placeholder:text-dark400_light700"
              placeholder="Ask for recommendations... (Press Enter to send, Shift+Enter for new line)"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-primary-500 hover:bg-primary-400 px-6 shadow-md"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        {error && (
          <p className="text-sm text-red-500 mt-2 px-1">{error}</p>
        )}
      </div>
    </div>
  )

  if (isPrivileged) {
    return recommendationContent
  }

  return (
    <Protect
      plan="groupchat"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
            <Sparkles className="h-10 w-10 text-primary-500" />
          </div>
          <h1 className="h2-bold text-dark100_light900 mb-3">Recommendations are premium</h1>
          <p className="text-dark500_light700 max-w-md mb-6">
            Sign in with an eligible plan to access AI-powered recommendations, or upgrade to unlock this feature.
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
      {recommendationContent}
    </Protect>
  )
}