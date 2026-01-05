/**
 * Content moderation utilities for detecting and preventing abusive content
 */

// Common profanity and abusive words (basic list - can be expanded)
// Note: Keep in lowercase for comparison
const PROFANITY_WORDS = [
  // Explicit profanity (common words) - most common first for faster detection
  'fuck', 'fucking', 'fucked', 'fucker',
  'shit', 'shitting', 'shitty',
  'damn', 'damned', 'dammit',
  'bitch', 'bitches', 'bitching',
  'asshole', 'ass', 'asses',
  'bastard', 'bastards',
  'crap', 'crappy',
  'hell',
  // Hate speech indicators
  'kill yourself', 'kys', 'die', 'hate you',
  // Harassment patterns
  'stupid', 'idiot', 'moron', 'retard',
];

// Patterns that indicate abuse or harassment
const ABUSIVE_PATTERNS = [
  /(?:^|\s)(?:f+u+c+k+|s+h+i+t+|d+a+m+n+|b+i+t+c+h+)(?:\s|$)/gi,
  /(?:kill\s+yourself|kys|k\s*y\s*s)/gi,
  /(?:you\s+should\s+die|go\s+die)/gi,
  /(?:i\s+hate\s+you|fuck\s+you)/gi,
];

// Patterns for excessive capitalization (shouting/aggressive behavior)
const SHOUTING_PATTERN = /^[A-Z\s!]{10,}$/; // All caps with 10+ chars

// Patterns for spam/repetition
const SPAM_PATTERN = /(.{1,10})\1{4,}/; // Same sequence repeated 5+ times

// Patterns for excessive special characters (potential obfuscation)
const OBFUSCATION_PATTERN = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{5,}/;

export interface ModerationResult {
  isValid: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Normalize text for comparison (remove special chars, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if text contains profanity
 */
function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const lowerText = text.toLowerCase().trim();
  
  // CRITICAL: First check if the entire message is exactly a profanity word
  // This catches cases like typing just "fuck"
  for (const word of PROFANITY_WORDS) {
    const lowerWord = word.toLowerCase();
    if (lowerText === lowerWord) {
      return true;
    }
  }
  
  // Split text into individual words (removing punctuation)
  const words = lowerText.split(/[\s\.,!?;:]+/).filter(w => w.length > 0);
  
  // Check if any word in the message matches a profanity word
  for (const word of words) {
    for (const profanityWord of PROFANITY_WORDS) {
      const lowerProfanity = profanityWord.toLowerCase();
      if (word === lowerProfanity) {
        return true;
      }
    }
  }
  
  // Word boundary regex check (catches profanity within sentences)
  for (const profanityWord of PROFANITY_WORDS) {
    const lowerProfanity = profanityWord.toLowerCase();
    const escapedWord = lowerProfanity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    if (wordBoundaryRegex.test(text)) {
      return true;
    }
  }
  
  // Check against abusive patterns (handles obfuscated attempts like "f-u-c-k")
  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for shouting (excessive capitalization)
 */
function isShouting(text: string): boolean {
  // Check if more than 70% of letters are uppercase
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 10) return false; // Ignore short messages
  
  const upperCaseCount = (letters.match(/[A-Z]/g) || []).length;
  const shoutingRatio = upperCaseCount / letters.length;
  
  return shoutingRatio > 0.7 || SHOUTING_PATTERN.test(text);
}

/**
 * Check for spam patterns (excessive repetition)
 */
function isSpam(text: string): boolean {
  return SPAM_PATTERN.test(text);
}

/**
 * Check for obfuscation attempts (excessive special characters)
 */
function isObfuscated(text: string): boolean {
  return OBFUSCATION_PATTERN.test(text);
}

/**
 * Check for personal attacks or harassment indicators
 */
function containsPersonalAttack(text: string): boolean {
  const normalized = normalizeText(text);
  const attackPatterns = [
    /\b(?:you\s+are|you're|ur)\s+(?:stupid|idiot|moron|dumb|ugly|fat|worthless|useless)\b/gi,
    /\b(?:i\s+hope\s+you|wish\s+you)\s+(?:die|fail|suffer)\b/gi,
    /\b(?:nobody\s+likes\s+you|everyone\s+hates\s+you)\b/gi,
  ];
  
  return attackPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Main content moderation function
 */
export function moderateContent(text: string): ModerationResult {
  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      reason: 'Message content is required',
      severity: 'low',
    };
  }

  const trimmedText = text.trim();
  
  // Check for empty or whitespace-only messages
  if (trimmedText.length === 0) {
    return {
      isValid: false,
      reason: 'Message cannot be empty',
      severity: 'low',
    };
  }

  // High severity checks (block immediately)
  if (containsProfanity(trimmedText)) {
    return {
      isValid: false,
      reason: 'Your message contains inappropriate language. Please keep the conversation friendly and respectful.',
      severity: 'high',
    };
  }

  if (containsPersonalAttack(trimmedText)) {
    return {
      isValid: false,
      reason: 'Personal attacks and harassment are not allowed. Please be respectful to other members.',
      severity: 'high',
    };
  }

  // Medium severity checks (warn but allow)
  if (isShouting(trimmedText)) {
    return {
      isValid: false,
      reason: 'Please avoid using all caps. It can be perceived as shouting or aggressive behavior.',
      severity: 'medium',
    };
  }

  if (isSpam(trimmedText)) {
    return {
      isValid: false,
      reason: 'Your message appears to be spam. Please avoid excessive repetition.',
      severity: 'medium',
    };
  }

  if (isObfuscated(trimmedText)) {
    return {
      isValid: false,
      reason: 'Your message contains excessive special characters. Please use clear, readable text.',
      severity: 'medium',
    };
  }

  // All checks passed
  return {
    isValid: true,
  };
}

/**
 * Client-side validation (can be used in React components)
 */
export function validateChatMessage(text: string): { valid: boolean; error?: string } {
  const result = moderateContent(text);
  
  if (!result.isValid) {
    return {
      valid: false,
      error: result.reason || 'Message validation failed',
    };
  }
  
  return { valid: true };
}

/**
 * Server-side validation (for API endpoints)
 */
export function validateMessageContent(text: string): { valid: boolean; error?: string; severity?: string } {
  const result = moderateContent(text);
  
  if (!result.isValid) {
    return {
      valid: false,
      error: result.reason || 'Message validation failed',
      severity: result.severity,
    };
  }
  
  return { valid: true };
}
