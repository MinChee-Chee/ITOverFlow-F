"use client"
import React, { useEffect, useState } from 'react'

import Prism from 'prismjs'

import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-aspnet";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-solidity";
import "prismjs/components/prism-json";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-r";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-go";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-mongodb";
import "prismjs/plugins/line-numbers/prism-line-numbers.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";

interface Props {
  data: string;
}

const ParseHTML = ({ data }: Props) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // Track mount state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Highlight after render when content is present and mounted
  useEffect(() => {
    if (!isMounted || !containerRef.current) return
    
    // Use requestAnimationFrame to ensure it runs after hydration
    const frameId = requestAnimationFrame(() => {
      // Only highlight code blocks within this container
      const codeBlocks = containerRef.current?.querySelectorAll('pre code')
      if (codeBlocks) {
        codeBlocks.forEach((block) => {
          Prism.highlightElement(block as HTMLElement)
        })
      }
    })
    
    return () => cancelAnimationFrame(frameId)
  }, [data, isMounted])

  if (!isMounted) {
    return (
      <div 
        ref={containerRef}
        className={'markdown w-full min-w-full'} 
        suppressHydrationWarning
      />
    )
  }

  return (
    <div 
      ref={containerRef}
      className={'markdown w-full min-w-full'} 
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: data }}
    />
  )
}

// Named export for better HMR stability
export { ParseHTML }
export default ParseHTML