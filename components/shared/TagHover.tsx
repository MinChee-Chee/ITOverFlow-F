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
        
        // Use user-friendly message if available, otherwise use the error message
        const errorMessage = errorData.userMessage || errorData.error || 'Failed to fetch tag information';
        
        // Check if it's a service unavailable error
        if (response.status === 503 || errorData.code === 'SERVICE_UNAVAILABLE' || errorData.code === 'SERVICE_ERROR') {
          setError('AI service is temporarily unavailable. Please try again later.');
        } else {
          setError(errorMessage);
        }
        return; // Don't throw, just set error state
      }

      const data = await response.json();
      if (data.description) {
        setTagDescription(data.description);
      } else {
        setError('Unable to generate tag description at this time. Please try again later.');
      }
    } catch (err) {
      // Handle network errors and other exceptions
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tag information';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        setError('Unable to connect to the AI service. Please check your internet connection and try again.');
      } else if (errorMessage.includes('API') || errorMessage.includes('service') || errorMessage.includes('unavailable')) {
        setError('AI service is temporarily unavailable. Please try again later.');
      } else {
        setError('Unable to load tag information at this time. Please try again later.');
      }
      
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
                <div className="text-sm break-words leading-relaxed">
                  <p className="text-amber-600 dark:text-amber-400 mb-1 font-medium">
                    Service Unavailable
                  </p>
                  <p className="text-dark400_light700">
                    {error}
                  </p>
                </div>
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
