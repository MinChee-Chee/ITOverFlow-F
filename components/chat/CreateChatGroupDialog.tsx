"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import TagCard from '@/components/cards/TagCard';
import { toast } from '@/hooks/use-toast';
import { getAllTags } from '@/lib/actions/tag.actions';

interface Tag {
  _id: string;
  name: string;
}

interface CreateChatGroupDialogProps {
  onGroupCreated?: () => void;
}

export default function CreateChatGroupDialog({ onGroupCreated }: CreateChatGroupDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Cache tags - only load once
  useEffect(() => {
    if (open && availableTags.length === 0) {
      loadTags();
    }
  }, [open, availableTags.length]);

  const loadTags = useCallback(async () => {
    if (availableTags.length > 0) return; // Already loaded
    
    setIsLoadingTags(true);
    try {
      const result = await getAllTags({ page: 1, pageSize: 100 });
      setAvailableTags(result.tags.map((tag: any) => ({
        _id: tag._id.toString(),
        name: tag.name,
      })));
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoadingTags(false);
    }
  }, [availableTags.length]);

  // Memoize tag lookup for performance
  const tagMap = useMemo(() => {
    const map = new Map<string, Tag>();
    availableTags.forEach(tag => map.set(tag.name.toLowerCase(), tag));
    return map;
  }, [availableTags]);

  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tagName = tagInput.trim().toLowerCase();
      const tag = tagMap.get(tagName);
      
      if (tag && !selectedTags.includes(tag._id)) {
        if (selectedTags.length < 4) {
          setSelectedTags(prev => [...prev, tag._id]);
          setTagInput('');
        } else {
          toast({
            title: "Maximum tags reached",
            description: "You can only select up to 4 tags.",
          });
        }
      } else if (!tag) {
        toast({
          title: "Tag not found",
          description: "Please select a tag from the available tags.",
        });
      } else {
        toast({
          title: "Tag already selected",
          description: "This tag is already in your selection.",
        });
      }
    }
  }, [tagInput, tagMap, selectedTags]);

  const handleTagRemove = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(id => id !== tagId));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || selectedTags.length === 0) {
      toast({
        title: "Validation error",
        description: "Name and at least one tag are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          tags: selectedTags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create chat group');
      }

      toast({
        title: "Success",
        description: "Chat group created successfully!",
      });

      // Reset form
      setName('');
      setDescription('');
      setSelectedTags([]);
      setTagInput('');
      setOpen(false);

      if (onGroupCreated) {
        onGroupCreated();
      }
    } catch (error) {
      console.error('Error creating chat group:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create chat group',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Chat Group</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Chat Group</DialogTitle>
          <DialogDescription>
            Create a new chat group based on tags. Only moderators can create chat groups.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags *</Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Type tag name and press Enter (max 4 tags)"
                disabled={isLoadingTags}
              />
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTags.map((tagId) => {
                    const tag = availableTags.find(t => t._id === tagId);
                    return tag ? (
                      <TagCard
                        key={tagId}
                        _id={tagId}
                        name={tag.name}
                        compact
                        isButton={true}
                        remove={true}
                        handleRemove={() => handleTagRemove(tagId)}
                      />
                    ) : null;
                  })}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Select up to 4 tags to identify this chat group.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

