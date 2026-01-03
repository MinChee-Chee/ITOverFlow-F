"use client"

import React, { useState } from 'react'
import ParseHTML from './ParseHTML'
import { Button } from '../ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  content: string;
  previewLines?: number;
}

const ExpandableAnswer = ({ content }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Always show toggle for answers (you can adjust this logic)
  // For now, show for any content longer than 100 characters
  const needsExpansion = content && content.trim().length > 100

  return (
    <div className="mt-4">
      <div
        className="relative transition-all duration-300"
        style={{
          maxHeight: isExpanded ? 'none' : '120px',
          overflow: 'hidden'
        }}
      >
        <div>
          <ParseHTML data={content} />
        </div>
        {!isExpanded && needsExpansion && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-light-900 via-light-900/80 to-transparent dark:from-dark-400 dark:via-dark-400/80 dark:to-transparent pointer-events-none" />
        )}
      </div>
      
      {needsExpansion && (
        <Button
          onClick={toggleExpanded}
          variant="ghost"
          size="sm"
          className="mt-2 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1 h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-4 w-4" />
              Show More
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export default ExpandableAnswer
