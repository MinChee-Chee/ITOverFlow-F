"use client"

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import Pusher from 'pusher-js';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const loadControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (chatGroupId) {
      loadMessages();
      setupPusher();
    }

    return () => {
      isMountedRef.current = false;

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
      return;
    }

    const channelName = `chat-group-${chatGroupId}`;
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
      });

      // Connection state diagnostics
      pusher.connection.bind('connected', () => {
        console.info('[Channels Client] Connection established:', {
          socketId: pusher.connection.socket_id,
          timestamp: new Date().toISOString(),
        });
      });

      pusher.connection.bind('disconnected', () => {
        console.warn('[Channels Client] Connection disconnected:', {
          timestamp: new Date().toISOString(),
        });
      });

      pusher.connection.bind('error', (error: any) => {
        console.error('[Channels Client] Connection error:', {
          error: error?.message || error,
          timestamp: new Date().toISOString(),
        });
      });

      pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
        console.info('[Channels Client] Connection state changed:', {
          from: states.previous,
          to: states.current,
          timestamp: new Date().toISOString(),
        });
      });

      const channel = pusher.subscribe(channelName);

      // Subscription event diagnostics
      channel.bind('pusher:subscription_succeeded', () => {
        console.info('[Channels Client] Subscription succeeded:', {
          channel: channelName,
          timestamp: new Date().toISOString(),
        });
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        console.error('[Channels Client] Subscription error:', {
          channel: channelName,
          error: error?.message || error,
          status: error?.status,
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Connection Error',
          description: 'Failed to subscribe to chat channel. Please refresh.',
          variant: 'destructive',
        });
      });

      // Message event handler
      channel.bind('new-message', (data: { message: Message }) => {
        console.info('[Channels Client] Received message:', {
          channel: channelName,
          messageId: data.message._id,
          timestamp: new Date().toISOString(),
        });

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

      pusherRef.current = pusher;
      channelRef.current = channel;
    } catch (error) {
      console.error('[Channels Client] Setup error:', {
        error: error instanceof Error ? error.message : String(error),
        channel: channelName,
        timestamp: new Date().toISOString(),
      });
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to real-time chat. Please refresh.',
        variant: 'destructive',
      });
    }
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
          if (body?.error) detail = `: ${body.error}`;
        } catch {
          // ignore JSON parse issues
        }
        throw new Error(
          `Failed to load messages (status ${response.status}${detail})`,
        );
      }
      
      const data = await response.json();

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
        throw new Error(error.error || 'Failed to send message');
      }

      const message = await response.json();
      setNewMessage('');
      
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{message.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.createdAt)}
                    </span>
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
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button type="submit" disabled={!newMessage.trim() || isSending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

