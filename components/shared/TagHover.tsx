"use client"

import { useState } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getDeviconClassName } from "@/lib/utils";

interface TagHoverProps {
  _id: string;
  name: string;
  children: React.ReactNode;
  questions?: number;
}

export default function TagHover({ _id, name, children, questions }: TagHoverProps) {
  const [tagDescription, setTagDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTagInfo = async () => {
    // Only fetch if we don't have the data yet
    if (tagDescription !== null || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/huggingface/tag-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagName: name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch tag information');
      }

      const data = await response.json();
      if (data.description) {
        setTagDescription(data.description);
      } else {
        throw new Error('No description received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tag information');
      console.error('Error fetching tag info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const iconClass = getDeviconClassName(name);
  const questionsCount = questions ?? 0;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger 
        asChild 
        onMouseEnter={fetchTagInfo}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 background-light900_dark200 border border-light-700 dark:border-dark-400 rounded-lg p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          {/* Icon - Circular black with white icon inside */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-black dark:bg-black flex items-center justify-center">
            <i className={`${iconClass} text-xl text-white`}></i>
          </div>

          {/* Content - Stacked vertically */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Tag Name - Bold, larger, white text */}
            <h4 className="font-bold text-dark200_light900 text-base leading-tight">
              {name}
            </h4>

            {/* Description - Multi-line, white text, smaller */}
            <div className="w-full">
              {isLoading ? (
                <div className="text-sm text-dark400_light700 flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <p className="text-sm text-red-500 dark:text-red-400 break-words leading-relaxed">
                  {error}
                </p>
              ) : tagDescription ? (
                <p className="text-sm text-dark200_light900 leading-relaxed break-words whitespace-pre-wrap">
                  {tagDescription}
                </p>
              ) : (
                <p className="text-sm text-dark400_light600 italic leading-relaxed">
                  Hover to load tag information...
                </p>
              )}
            </div>

            {/* Metadata - Lighter grey, smaller text */}
            {_id && _id !== name && questionsCount > 0 && (
              <p className="text-xs text-dark400_light700 leading-tight">
                {questionsCount} {questionsCount === 1 ? 'question' : 'questions'}
              </p>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
