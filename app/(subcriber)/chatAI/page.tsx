"use client"

import { useEffect, useState, useRef } from "react"
import { Protect, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Send, Bot, User, X, Copy, History as HistoryIcon, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"

type ChatMessage = {
  id: string
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
  timestamp: Date
}

const SUGGESTED_QUERIES = [
  "What are the best practices for React development?",
  "How do I implement authentication in Next.js?",
  "Explain database design patterns",
  "What is the difference between REST and GraphQL?",
  "How to optimize React performance?",
  "Best practices for API security",
]

export default function ChatAIPage() {
  const [input, setInput] = useState("")
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
  const hasCheckedRole = useRef(false)

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

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

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setInput(suggestedQuery)
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.requestSubmit()
      }
    }, 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading || trimmedInput.length > 5000) {
      if (trimmedInput.length > 5000) {
        setError("Message is too long. Please keep it under 5000 characters.")
      }
      return
    }

    setIsLoading(true)
    setError(null)

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")

    try {
      // Prepare messages for API (include conversation history)
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      const res = await fetch("/api/chat-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: apiMessages,
          model: 'gpt-4o'
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to get AI response")
      }

      const data = await res.json()
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message?.content || data.content || "No response generated",
        citations: data.citations || [],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error")
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to get AI response"}`,
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

  // Unified initialization flow
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
          console.error("Error checking role for chat AI access:", error)
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

  if (!mounted || !isLoaded || roleLoading) {
    return null
  }

  const chatContent = (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto rounded-lg overflow-hidden shadow-sm border border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200">
      {/* Header */}
      <div className="px-6 py-5 border-b border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="h2-bold text-dark100_light900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-500" />
            AI Assistant Chat
          </h1>
          <p className="text-sm text-dark500_light700 mt-1">
            Chat with AI assistant powered by Pinecone
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/chatAI/history">
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
              Ask me anything and I'll help you with answers based on your documents
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
            className={`flex gap-3 items-start ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[85%] rounded-xl p-4 shadow-sm ${
                message.role === "user"
                  ? "bg-primary-500 text-white"
                  : "bg-light-800 dark:bg-dark-300 text-dark200_light900 border border-light-700 dark:border-dark-400"
              }`}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm font-medium whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs opacity-70">
                  {message.timestamp instanceof Date && !isNaN(message.timestamp.getTime())
                    ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : ""}
                </span>
                {message.role === "assistant" && (
                  <button
                    onClick={(e) => {
                      copyToClipboard(message.content, e.currentTarget as HTMLElement)
                    }}
                    className="p-1.5 hover:bg-light-700 dark:hover:bg-dark-400 rounded-md transition-all opacity-60 hover:opacity-100"
                    title="Copy message"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {message.role === "user" && (
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
                <span className="text-sm text-dark400_light700">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-light-700 dark:border-dark-400 bg-light-900 dark:bg-dark-200 p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                e.stopPropagation()
                const form = e.currentTarget.closest('form')
                if (form && !isLoading && input.trim()) {
                  form.requestSubmit()
                }
              }
            }}
            rows={1}
            className="flex-1 rounded-lg border border-light-700 dark:border-dark-400 bg-light-800 dark:bg-dark-300 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-dark200_light900 placeholder:text-dark400_light700"
            placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
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

  // Admins and moderators can access ChatAI without subscription
  if (isPrivileged) {
    return chatContent
  }

  // Other users must have the required plan
  return (
    <Protect
      plan="groupchat"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-10 w-10 text-primary-500" />
          </div>
          <h1 className="h2-bold text-dark100_light900 mb-3">AI Assistant is premium</h1>
          <p className="text-dark500_light700 max-w-md mb-6">
            Sign in with an eligible plan to access AI assistant, or upgrade to unlock this feature.
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
      {chatContent}
    </Protect>
  )
}
