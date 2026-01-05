"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ChatGroupList from '@/components/chat/ChatGroupList';
import ChatInterface from '@/components/chat/ChatInterface';
import { Protect } from '@clerk/nextjs'
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Memoized ChatContent component to prevent re-renders
const ChatContent = memo(({ 
  selectedGroupId, 
  onGroupSelect 
}: { 
  selectedGroupId: string | null;
  onGroupSelect: (id: string) => void;
}) => (
  <div className="flex h-[calc(100vh-200px)] min-h-[600px]">
    {/* Sidebar - Chat Groups List */}
    <div className="w-1/3 border-r flex flex-col background-light900_dark200">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark200_light900">Chat Groups</h1>
      </div>
      <ChatGroupList
        selectedGroupId={selectedGroupId || undefined}
        onGroupSelect={onGroupSelect}
      />
    </div>

    {/* Main Chat Area */}
    <div className="flex-1 flex flex-col background-light900_dark200">
      {selectedGroupId ? (
        <ChatInterface chatGroupId={selectedGroupId} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <p className="text-lg text-dark400_light700">
              Select a chat group to start chatting
            </p>
            <p className="text-sm text-dark400_light700">
              Join a group to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
));

ChatContent.displayName = 'ChatContent';

// Memoized ModeratorChatContent to prevent re-renders
const ModeratorChatContent = memo(({ 
  selectedGroupId, 
  onGroupSelect,
}: { 
  selectedGroupId: string | null;
  onGroupSelect: (id: string) => void;
}) => (
  <div className="flex h-[calc(100vh-200px)] min-h-[600px]">
    {/* Sidebar - Chat Groups List */}
    <div className="w-1/3 border-r flex flex-col background-light900_dark200">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark200_light900">Chat Groups</h1>
        <Link href="/moderator">
          <Button size="sm" variant="outline">
            Manage groups
          </Button>
        </Link>
      </div>
      <ChatGroupList
        selectedGroupId={selectedGroupId || undefined}
        onGroupSelect={onGroupSelect}
      />
    </div>

    {/* Main Chat Area */}
    <div className="flex-1 flex flex-col background-light900_dark200">
      {selectedGroupId ? (
        <ChatInterface chatGroupId={selectedGroupId} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <p className="text-lg text-dark400_light700">
              Select a chat group to start chatting
            </p>
            <p className="text-sm text-dark400_light700">
              Join a group or create one if you're a moderator
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
));

ModeratorChatContent.displayName = 'ModeratorChatContent';

function ChatPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedRole = useRef(false);
  const hasRedirected = useRef(false);

  // Memoize the role check to prevent multiple calls
  useEffect(() => {
    if (!isLoaded || hasCheckedRole.current) return;
    
    hasCheckedRole.current = true;
    
    const checkModeratorStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-role');
        if (response.ok) {
          const data = await response.json();
          setIsModerator(data.isModerator || data.isAdmin);
        }
      } catch (error) {
        console.error('Error checking role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkModeratorStatus();
  }, [isLoaded]);

  // Memoize callbacks to prevent re-renders
  const handleGroupSelect = useCallback((id: string) => {
    setSelectedGroupId(id);
  }, []);

  // Memoize fallback component to prevent re-creation
  const fallbackContent = useMemo(() => (
    <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="h1-bold text-dark100_light900 mb-4">Chat Groups - Premium Feature</h1>
      <p className="body-regular text-dark500_light700 mb-8">
        The Chat Groups feature is available to subscribers. Subscribe to a plan to access this feature.
      </p>
      <Link href="/pricing">
        <Button className="bg-primary-500 hover:bg-primary-400">
          Subscribe to a plan
        </Button>
      </Link>
    </div>
  ), []);

  // Redirect unauthenticated users to sign in
  useEffect(() => {
    if (isLoaded && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Prevent hydration mismatch by not rendering until client-side is ready
  if (!isLoaded || isLoading) {
    return null;
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // If user is moderator or admin, allow access without subscription
  if (isModerator) {
    return (
      <ModeratorChatContent
        selectedGroupId={selectedGroupId}
        onGroupSelect={handleGroupSelect}
      />
    );
  }

  // For non-moderators, require subscription
  return (
    <Protect  
      plan="groupchat"
      fallback={fallbackContent}
    >
      <ChatContent 
        selectedGroupId={selectedGroupId}
        onGroupSelect={handleGroupSelect}
      />
    </Protect>
  );
}

export default memo(ChatPage);

