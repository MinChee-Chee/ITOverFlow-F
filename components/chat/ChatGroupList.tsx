"use client"

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import TagCard from '@/components/cards/TagCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface Tag {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  clerkId: string;
  name: string;
  picture: string;
  username: string;
}

interface ChatGroup {
  _id: string;
  name: string;
  description?: string;
  lastMessageSnippet?: string;
  tags: Tag[];
  moderator: User;
  members: User[];
  createdAt: string;
  updatedAt: string;
  hasUnread?: boolean;
}

interface ChatGroupListProps {
  selectedGroupId?: string;
  onGroupSelect?: (groupId: string) => void;
}

export default function ChatGroupList({ selectedGroupId, onGroupSelect }: ChatGroupListProps) {
  const { user } = useUser();
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load chat groups when debounced search query or tag filter changes
  useEffect(() => {
    loadChatGroups();
  }, [debouncedSearchQuery, tagFilter]);

  const loadChatGroups = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.set('searchQuery', debouncedSearchQuery);
      if (tagFilter) params.set('tagId', tagFilter);
      
      const response = await fetch(`/api/chat/groups?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to load chat groups';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setChatGroups(data.chatGroups || []);
    } catch (error) {
      console.error('Error loading chat groups:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load chat groups';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/chat/groups/${groupId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join group');
      }

      toast({
        title: "Success",
        description: "You've joined the chat group!",
      });

      loadChatGroups();
      if (onGroupSelect) {
        onGroupSelect(groupId);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to join group',
        variant: "destructive",
      });
    }
  };

  const isMember = (group: ChatGroup) => {
    if (!user) return false;
    return group.members.some(member => member.clerkId === user.id);
  };

  const markGroupAsRead = async (groupId: string) => {
    try {
      await fetch('/api/chat/groups/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatGroupId: groupId }),
      });
    } catch (error) {
      console.error('Error marking chat group as read from list:', error);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    // Optimistically clear unread badge for this group in the local list
    setChatGroups((prev) =>
      prev.map((g) =>
        g._id === groupId
          ? { ...g, hasUnread: false }
          : g,
      ),
    );

    // Persist read state on the server so that a page refresh also hides the badge
    markGroupAsRead(groupId);

    if (onGroupSelect) {
      onGroupSelect(groupId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading chat groups...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <Input
          placeholder="Search chat groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {chatGroups.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No chat groups found</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {chatGroups.map((group) => {
              const userIsMember = isMember(group);
              const isSelected = selectedGroupId === group._id;

              return (
                <div
                  key={group._id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleSelectGroup(group._id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{group.name}</h3>
                        {userIsMember && (
                          <Badge variant="secondary" className="text-xs">
                            Member
                          </Badge>
                        )}
                        {userIsMember && group.hasUnread && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      {(group.hasUnread && group.lastMessageSnippet) ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.lastMessageSnippet}
                        </p>
                      ) : group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {group.tags.map((tag) => (
                          <TagCard
                            key={tag._id}
                            _id={tag._id}
                            name={tag.name}
                            compact
                            noLink
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{group.members.length} members</span>
                        <span>Mod: {group.moderator.name}</span>
                      </div>
                    </div>
                    {!userIsMember && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group._id);
                        }}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

