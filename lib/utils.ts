/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import qs from "query-string"
import { BADGE_CRITERIA } from "@/constants";
import { BadgeCounts } from "@/types";
import { techMap } from "@/constants/techMap";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Escape special regex characters in a string
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getDeviconClassName = (techName: string) => {
  const normalizedTechName = techName.replace(/[ .]/g, "").toLowerCase();

  return techMap[normalizedTechName]
    ? `${techMap[normalizedTechName]} colored`
    : "devicon-devicon-plain";
};

export const getTimestamp = (createdAt: Date, now?: Date): string => {
  // Use provided now time or current time
  const currentTime = now || new Date();
  
  const minute = 60 * 1000;
  const nowRounded = new Date(Math.floor(currentTime.getTime() / minute) * minute);
  const createdAtRounded = new Date(Math.floor(createdAt.getTime() / minute) * minute);
  
  const timeDifference = nowRounded.getTime() - createdAtRounded.getTime();

  // Define time intervals in milliseconds
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  // Use a slightly wider \"just now\" window (< 2 minutes) so that small
  // server/client timing differences around hydration don't flip between
  // \"just now\" and \"1 minute ago\".
  if (timeDifference < 2 * minute) {
    return "just now";
  } else if (timeDifference < hour) {
    const minutes = Math.floor(timeDifference / minute);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (timeDifference < day) {
    const hours = Math.floor(timeDifference / hour);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (timeDifference < week) {
    const days = Math.floor(timeDifference / day);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (timeDifference < month) {
    const weeks = Math.floor(timeDifference / week);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (timeDifference < year) {
    const months = Math.floor(timeDifference / month);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(timeDifference / year);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

export const formatAndDivideNumber = (num: number): string => {
  if (num >= 1000000) {
    const formattedNum = (num / 1000000).toFixed(1);
    return `${formattedNum}M`;
  } else if (num >= 1000) {
    const formattedNum = (num / 1000).toFixed(1);
    return `${formattedNum}K`;
  } else {
    return num.toString();
  }
};

export const getJoinedDate = (date: Date): string => {
  // Extract the day, month, and year from the Date object
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  const joinedDate = `${month} ${day}, ${year}`;

  return joinedDate;
}

interface UrlQueryParams {
  params: string;
  key: string;
  value: string | null;
}

export const formUrlQuery = ({ params, key, value}: UrlQueryParams) => {
  const currentUrl = qs.parse(params);

  currentUrl[key] = value;

  // This function is intended for client-side use only
  if (typeof window === 'undefined') {
    throw new Error('formUrlQuery can only be used in client components');
  }

  return qs.stringifyUrl({
    url: window.location.pathname,
    query: currentUrl,
  },
  { skipNull: true})
}

interface RemoveUrlQueryParams {
  params: string;
  keysToRemove: string[];
}

export const removeKeysFromQuery = ({ params, keysToRemove}: RemoveUrlQueryParams) => {
  const currentUrl = qs.parse(params);

  keysToRemove.forEach((key) => {
    delete currentUrl[key];
  })

  // This function is intended for client-side use only
  if (typeof window === 'undefined') {
    throw new Error('removeKeysFromQuery can only be used in client components');
  }

  return qs.stringifyUrl({
    url: window.location.pathname,
    query: currentUrl,
  },
  { skipNull: true})
}

interface BadgeParam {
  criteria: {
    type: keyof typeof BADGE_CRITERIA;
    count: number;
  }[]
}

export const assignBadges = (params: BadgeParam) => {
  const badgeCounts: BadgeCounts = {
    GOLD: 0,
    SILVER: 0,
    BRONZE: 0,
  }

  const { criteria } = params;

  criteria.forEach((item) => {
    const { type, count } = item;
    
    const badgeLevels: any = BADGE_CRITERIA[type];

    
    Object.keys(badgeLevels).forEach((level: any) => {
      if(count >= badgeLevels[level]) {
        badgeCounts[level as keyof BadgeCounts] +=1 ;
      }
    })
  })

  return badgeCounts;
}

// SWR Fetcher function
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    // Try to get error message from JSON response
    const contentType = res.headers.get('content-type');
    let errorMessage = 'An error occurred while fetching the data.';
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default message
      }
    } else {
      // If response is HTML, try to get text for debugging
      try {
        const text = await res.text();
        // Log HTML responses for debugging (usually error pages)
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.error(`Received HTML instead of JSON from ${url}. Status: ${res.status}`);
        }
      } catch {
        // Ignore errors when reading text
      }
    }
    
    const error = new Error(errorMessage);
    // Attach extra info to the error object
    (error as any).status = res.status;
    throw error;
  }
  
  // Check if response is actually JSON before parsing
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    // If we got HTML, log it for debugging
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.error(`Received HTML instead of JSON from ${url}. Response preview:`, text.substring(0, 200));
      throw new Error(`Expected JSON but received HTML from ${url}. This usually means the API route returned an error page.`);
    }
    throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'} from ${url}`);
  }
  
  return res.json();
}

/**
 * Calculate similarity score from ChromaDB distance (client-side fallback)
 * This matches the backend calculation for consistency
 * 
 * Uses relative ranking when allDistances is provided: the best result gets 
 * 95-100%, and others are scaled relative to the best and worst results.
 * 
 * @param distance - The distance value from ChromaDB
 * @param allDistances - Array of all distances for relative scoring
 * @returns Similarity score from 0-100, or null if invalid
 */
export const calculateSimilarityFromDistance = (
  distance: number | null | undefined,
  allDistances?: number[]
): number | null => {
  // Handle invalid values
  if (distance === null || distance === undefined || isNaN(distance) || !isFinite(distance)) {
    return null;
  }

  // If we have all distances, use relative ranking
  if (allDistances && allDistances.length > 0) {
    const validDistances = allDistances.filter(d => 
      d !== null && d !== undefined && !isNaN(d) && isFinite(d)
    );
    
    if (validDistances.length > 0) {
      const minDistance = Math.min(...validDistances);
      const maxDistance = Math.max(...validDistances);
      const range = maxDistance - minDistance;

      // If all distances are the same, return high score
      if (range < 0.0001) {
        return 95;
      }

      // Normalize: how far is this distance from the best (min)?
      const normalizedPosition = (distance - minDistance) / range;
      
      // Map to score: best gets ~95%, worst gets ~60%
      const similarity = 95 - (normalizedPosition * 35);
      return Math.max(0, Math.min(100, similarity));
    }
  }

  // Fallback for single distance without context
  // Use a reasonable default assuming typical cosine distance range
  if (distance <= 0.5) {
    return 95;
  } else if (distance <= 1.0) {
    return 85 - ((distance - 0.5) * 30);
  } else if (distance <= 1.5) {
    return 70 - ((distance - 1.0) * 20);
  } else {
    return Math.max(50, 60 - ((distance - 1.5) * 20));
  }
};

/**
 * Format ban time remaining in a human-readable string
 * @param expiresAt - The expiration date/time of the ban
 * @returns Formatted string like "2 days and 5 hours" or "3 hours", or null if invalid
 */
export const formatBanTimeRemaining = (expiresAt: string | Date | null | undefined): string | null => {
  if (!expiresAt) return null;
  
  try {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursRemaining <= 0) return 'Your ban will expire soon.';
    
    const days = Math.floor(hoursRemaining / 24);
    const hours = hoursRemaining % 24;
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
  } catch {
    return null;
  }
};

/**
 * Get ban error message with formatted time remaining
 * @param expiresAt - The expiration date/time of the ban
 * @returns Error message string
 */
export const getBanErrorMessage = (expiresAt: string | Date | null | undefined): string => {
  const timeRemaining = formatBanTimeRemaining(expiresAt);
  if (!timeRemaining) {
    return 'You have been banned from this chat group for 2 days due to a violation of the community guidelines.';
  }
  return `You have been banned from this chat group for 2 days due to a violation of the community guidelines. The ban will expire in ${timeRemaining}.`;
};