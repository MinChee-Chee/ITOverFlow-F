"use client"

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import Pusher from 'pusher-js';
import { validateChatMessage } from '@/lib/content-moderation';
import ReportChatMessageButton from './ReportChatMessageButton';
import { formatBanTimeRemaining, getBanErrorMessage } from '@/lib/utils';

interface User {
  _id: string;
  clerkId: string;
  name: string;
  picture: string;
  username: string;
}

interface Message {
  _id: string;
  content: string;
  author: User;
  chatGroup: string;
  createdAt: string;
}

interface ChatInterfaceProps {
  chatGroupId: string;
}

export default function ChatInterface({ chatGroupId }: ChatInterfaceProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('connecting');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [banStatus, setBanStatus] = useState<{ banned: boolean; expiresAt?: string; bannedAt?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const loadControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttemptsRef.current = 0;

    if (chatGroupId) {
      loadMessages();
      setupPusher();
      
      // Periodically check ban status (every 30 seconds) to catch bans that happen while user is in the chat
      // Only check if user is not already banned to avoid unnecessary API calls
      const banCheckInterval = setInterval(async () => {
        if (!isMountedRef.current || !chatGroupId) return;
        
        // Skip check if already banned - Pusher will notify us of ban changes
        if (banStatus?.banned) {
          return;
        }
        
        try {
          const response = await fetch(`/api/chat/ban-status?chatGroupId=${chatGroupId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.banStatus?.banned) {
              const previousBanned = banStatus?.banned || false;
              const newBanStatus = {
                banned: true,
                expiresAt: data.banStatus.expiresAt,
                bannedAt: data.banStatus.bannedAt,
              };
              
              setBanStatus(newBanStatus);
              
              // Only show toast if ban status changed (newly banned)
              if (!previousBanned) {
                toast({
                  title: 'You have been banned',
                  description: getBanErrorMessage(data.banStatus.expiresAt),
                  variant: 'destructive',
                  duration: 10000, // Show for 10 seconds
                });
              }
            } else if (data.banStatus && !data.banStatus.banned) {
              // User is not banned, clear ban status if it was set
              if (banStatus?.banned) {
                setBanStatus({ banned: false });
              }
            }
          }
        } catch (error) {
          // Silently fail - don't disrupt user experience
          console.error('Error checking ban status:', error);
        }
      }, 30000); // Check every 30 seconds

      return () => {
        clearInterval(banCheckInterval);
        isMountedRef.current = false;

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        if (channelRef.current) {
          channelRef.current.unbind_all();
          channelRef.current.unsubscribe();
        }
        if (pusherRef.current) {
          pusherRef.current.disconnect();
        }

        if (loadControllerRef.current) {
          loadControllerRef.current.abort();
          loadControllerRef.current = null;
        }
      };
    }
  }, [chatGroupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupPusher = () => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';
    
    if (!pusherKey) {
      console.warn('[Channels Client] Pusher key not configured. Real-time updates will not work.');
      setConnectionStatus('error');
      return;
    }

    // Clean up existing connection before creating a new one
    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unbind_all();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channelName = `chat-group-${chatGroupId}`;
    setConnectionStatus('connecting');
    
    console.info('[Channels Client] Setting up connection:', {
      channel: channelName,
      cluster: pusherCluster,
      timestamp: new Date().toISOString(),
    });

    try {
      const pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: '/api/pusher/auth',
        enabledTransports: ['ws', 'wss'],
        forceTLS: true,
      });

      // Connection state diagnostics
      pusher.connection.bind('connected', () => {
        console.info('[Channels Client] Connection established:', {
          socketId: pusher.connection.socket_id,
          timestamp: new Date().toISOString(),
        });
        if (isMountedRef.current) {
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0; // Reset on successful connection
        }
      });

      pusher.connection.bind('disconnected', () => {
        console.warn('[Channels Client] Connection disconnected:', {
          timestamp: new Date().toISOString(),
        });
        if (isMountedRef.current) {
          setConnectionStatus('disconnected');
          attemptReconnect();
        }
      });

      pusher.connection.bind('error', (error: any) => {
        console.error('[Channels Client] Connection error:', {
          error: error?.message || error,
          timestamp: new Date().toISOString(),
        });
        if (isMountedRef.current) {
          setConnectionStatus('error');
          attemptReconnect();
        }
      });

      pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
        console.info('[Channels Client] Connection state changed:', {
          from: states.previous,
          to: states.current,
          timestamp: new Date().toISOString(),
        });
        
        // Update connection status based on state
        if (isMountedRef.current) {
          if (states.current === 'connected') {
            setConnectionStatus('connected');
          } else if (states.current === 'disconnected' || states.current === 'failed') {
            setConnectionStatus('disconnected');
          } else if (states.current === 'connecting') {
            setConnectionStatus('connecting');
          }
        }
      });

      const channel = pusher.subscribe(channelName);

      // Subscription event diagnostics
      channel.bind('pusher:subscription_succeeded', () => {
        console.info('[Channels Client] Subscription succeeded:', {
          channel: channelName,
          timestamp: new Date().toISOString(),
        });
        if (isMountedRef.current) {
          setConnectionStatus('connected');
        }
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        console.error('[Channels Client] Subscription error:', {
          channel: channelName,
          error: error?.message || error,
          status: error?.status,
          timestamp: new Date().toISOString(),
        });
        if (isMountedRef.current) {
          setConnectionStatus('error');
          toast({
            title: 'Connection Error',
            description: 'Failed to subscribe to chat channel. Attempting to reconnect...',
            variant: 'destructive',
          });
          attemptReconnect();
        }
      });

      // Message event handler
      channel.bind('new-message', (data: { message: Message }) => {
        console.info('[Channels Client] Received message:', {
          channel: channelName,
          messageId: data.message._id,
          timestamp: new Date().toISOString(),
        });

        if (!isMountedRef.current) return;

        setMessages((prev) => {
          // Avoid duplicates by checking if message already exists
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) {
            console.warn('[Channels Client] Duplicate message detected, ignoring:', {
              messageId: data.message._id,
            });
            return prev;
          }
          // Add new message and sort by createdAt to maintain order
          return [...prev, data.message].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        // When this chat is open and receives a new message, mark it as read
        if (document.visibilityState === 'visible') {
          markGroupAsRead();
        }
      });

      // Message deletion event handler
      channel.bind('message-deleted', (data: { messageId: string }) => {
        console.info('[Channels Client] Message deleted:', {
          channel: channelName,
          messageId: data.messageId,
          timestamp: new Date().toISOString(),
        });

        if (!isMountedRef.current) return;

        setMessages((prev) => prev.filter(m => m._id !== data.messageId));
      });

      // User banned event handler
      channel.bind('user-banned', (data: { userId: string; expiresAt: string }) => {
        console.info('[Channels Client] User banned:', {
          channel: channelName,
          userId: data.userId,
          expiresAt: data.expiresAt,
          timestamp: new Date().toISOString(),
        });

        if (!isMountedRef.current) return;

        // Reload messages to check if current user was banned and get updated ban status
        // The ban check will determine if this user is affected
        loadMessages();
      });

      pusherRef.current = pusher;
      channelRef.current = channel;
    } catch (error) {
      console.error('[Channels Client] Setup error:', {
        error: error instanceof Error ? error.message : String(error),
        channel: channelName,
        timestamp: new Date().toISOString(),
      });
      if (isMountedRef.current) {
        setConnectionStatus('error');
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to real-time chat. Attempting to reconnect...',
          variant: 'destructive',
        });
        attemptReconnect();
      }
    }
  };

  const attemptReconnect = () => {
    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Limit reconnection attempts (max 5 attempts with exponential backoff)
    if (reconnectAttemptsRef.current >= 5) {
      console.warn('[Channels Client] Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Exponential backoff, max 30s

    console.info('[Channels Client] Scheduling reconnection attempt:', {
      attempt: reconnectAttemptsRef.current,
      delayMs: delay,
      timestamp: new Date().toISOString(),
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && chatGroupId) {
        console.info('[Channels Client] Attempting reconnection...');
        setupPusher();
      }
    }, delay);
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Abort any in-flight request when switching groups
      if (loadControllerRef.current) {
        loadControllerRef.current.abort();
      }

      const controller = new AbortController();
      loadControllerRef.current = controller;

      const response = await fetch(
        `/api/chat/messages?chatGroupId=${chatGroupId}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        // Try to surface backend error for easier debugging
        let detail = '';
        try {
          const body = await response.json();
          if (body?.error) {
            detail = `: ${body.error}`;
            // Check if error is about being banned
            if (body.error.includes('banned')) {
              setBanStatus({
                banned: true,
                expiresAt: undefined,
                bannedAt: undefined,
              });
              const errorMsg = body.error || 'You have been banned from this chat group';
              toast({
                title: 'You have been banned',
                description: `You have been banned from this chat group for 2 days due to a violation of the community guidelines. ${errorMsg}`,
                variant: 'destructive',
                duration: 10000, // Show for 10 seconds
              });
            }
          }
        } catch {
          // ignore JSON parse issues
        }
        throw new Error(
          `Failed to load messages (status ${response.status}${detail})`,
        );
      }
      
      const data = await response.json();

      // Check for ban status in response
      if (data.banStatus) {
        setBanStatus({
          banned: data.banStatus.banned,
          expiresAt: data.banStatus.expiresAt,
          bannedAt: data.banStatus.bannedAt,
        });
        
              // If banned, show error and prevent further interaction
              if (data.banStatus.banned) {
                toast({
                  title: 'You have been banned',
                  description: getBanErrorMessage(data.banStatus.expiresAt),
                  variant: 'destructive',
                  duration: 10000, // Show for 10 seconds
                });
              }
      } else {
        setBanStatus({ banned: false });
      }

      // Remove duplicates, sort by createdAt, and cap the list size for performance
      const uniqueMessages = (data.messages || [])
        .reduce((acc: Message[], message: Message) => {
          if (!acc.find((m) => m._id === message._id)) {
            acc.push(message);
          }
          return acc;
        }, [] as Message[])
        .sort(
          (a: Message, b: Message) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime(),
        )
        .slice(-200); // keep only the latest 200 messages

      if (isMountedRef.current) {
        setMessages(uniqueMessages);
      }

      // After loading messages for an open group, mark as read
      await markGroupAsRead();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.message === 'The user aborted a request.')
      ) {
        // Expected when switching groups quickly; no user-facing error
        return;
      }

      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const markGroupAsRead = async () => {
    try {
      await fetch('/api/chat/groups/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatGroupId }),
      });
    } catch (error) {
      console.error('Error marking chat group as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSending) return;

    // Client-side validation before sending
    const validation = validateChatMessage(newMessage.trim());
    if (!validation.valid) {
      setValidationError(validation.error || 'Message validation failed');
      toast({
        title: 'Message Not Allowed',
        description: validation.error || 'Your message contains inappropriate content. Please revise your message.',
        variant: 'destructive',
      });
      return;
    }

    // Clear any previous validation errors
    setValidationError(null);
    setIsSending(true);
    
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          chatGroupId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle ban errors
        if (error.error && error.error.includes('banned')) {
          toast({
            title: 'You have been banned',
            description: `You have been banned from this chat group for 2 days due to a violation of the community guidelines. ${error.error}`,
            variant: 'destructive',
            duration: 10000, // Show for 10 seconds
          });
          // Reload messages to get updated ban status
          loadMessages();
          return;
        }
        
        // Handle content moderation errors specifically
        if (error.code === 'CONTENT_MODERATION') {
          setValidationError(error.error || 'Message contains inappropriate content');
          toast({
            title: 'Message Not Allowed',
            description: error.error || 'Your message contains inappropriate content. Please keep the conversation friendly and respectful.',
            variant: 'destructive',
          });
          return;
        }
        
        throw new Error(error.error || 'Failed to send message');
      }

      const message = await response.json();
      setNewMessage('');
      setValidationError(null); // Clear validation error on success
      
      // Message will be added via Pusher, but add optimistically if not already present
      setMessages((prev) => {
        // Check if message already exists (might have arrived via Pusher first)
        const exists = prev.some(m => m._id === message._id);
        if (exists) {
          return prev;
        }
        // Add new message and sort by createdAt to maintain order
        return [...prev, message].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isCurrentUser = (authorClerkId: string) => {
    return user?.id === authorClerkId;
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (deletingMessageId) return; // Prevent multiple simultaneous deletions

    if (!messageId) {
      console.error('[Delete Message] Message ID is missing');
      toast({
        title: 'Error',
        description: 'Message ID is missing',
        variant: 'destructive',
      });
      return;
    }

    // Ensure messageId is a string
    const cleanMessageId = String(messageId).trim();
    
    if (!cleanMessageId) {
      toast({
        title: 'Error',
        description: 'Invalid message ID',
        variant: 'destructive',
      });
      return;
    }

    setDeletingMessageId(cleanMessageId);
    
    try {
      const url = `/api/chat/messages/${encodeURIComponent(cleanMessageId)}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Failed to delete message');
      }

      // Optimistically remove the message from the UI
      setMessages((prev) => prev.filter(m => m._id !== messageId));
      
      toast({
        title: 'Message deleted',
        description: 'Your message has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete message',
        variant: 'destructive',
      });
    } finally {
      setDeletingMessageId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  // Calculate time remaining if banned (using utility function)
  const getBanTimeRemaining = () => {
    if (!banStatus?.banned || !banStatus.expiresAt) return null;
    return formatBanTimeRemaining(banStatus.expiresAt);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Indicator */}
      <div className="px-4 py-2 border-b flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
        <span className="text-muted-foreground">{getConnectionStatusText()}</span>
      </div>

      {/* Ban Notice */}
      {banStatus?.banned && (
        <div className="px-4 py-4 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-destructive mt-2" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive mb-1">
                You have been banned from this chat group
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                You have been banned for 2 days due to a violation of the community guidelines.
              </p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const timeRemaining = getBanTimeRemaining();
                  if (timeRemaining) {
                    return `Ban expires in ${timeRemaining}.`;
                  }
                  return 'Your ban will expire soon.';
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = isCurrentUser(message.author.clerkId);
            
            return (
              <div
                key={message._id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
              >
                <div className="flex-shrink-0">
                  <Image
                    src={message.author.picture || '/assets/icons/avatar.svg'}
                    alt={message.author.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-sm font-medium">{message.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.createdAt)}
                    </span>
                    {isUser && (
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        disabled={deletingMessageId === message._id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 disabled:opacity-50 cursor-pointer"
                        title="Delete message"
                        aria-label="Delete message"
                      >
                        <Image
                          src="/assets/icons/trash.svg"
                          alt="Delete"
                          width={14}
                          height={14}
                          className="invert-colors"
                        />
                      </button>
                    )}
                    {!isUser && user?.id && (
                      <ReportChatMessageButton 
                        messageId={message._id} 
                        userId={user.id}
                      />
                    )}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex flex-col gap-2">
          {validationError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {validationError}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              disabled={banStatus?.banned || false}
              onChange={(e) => {
                const newValue = e.target.value;
                setNewMessage(newValue);
                
                // Real-time validation feedback - validate immediately on every keystroke
                const trimmed = newValue.trim();
                if (trimmed.length > 0) {
                  // Validate synchronously
                  try {
                    const validation = validateChatMessage(trimmed);
                    if (!validation.valid) {
                      setValidationError(validation.error || null);
                    } else {
                      setValidationError(null);
                    }
                  } catch (error) {
                    // If validation throws, clear error (shouldn't happen, but be safe)
                    console.error('Validation error:', error);
                    setValidationError(null);
                  }
                } else {
                  setValidationError(null);
                }
              }}
              placeholder={banStatus?.banned ? "You are banned from this chat group" : "Type your message..."}
              rows={2}
              className={`resize-none ${validationError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Don't send if there's a validation error or if banned
                  if (!validationError && !banStatus?.banned) {
                    handleSendMessage(e);
                  }
                }
              }}
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || isSending || !!validationError || banStatus?.banned || false}
              className="self-end"
            >
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

