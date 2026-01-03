"use client"
import React, { useEffect, useMemo, useState } from 'react'

import Prism from 'prismjs'
import parse from 'html-react-parser'

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
  
  // Parse once per `data` value so initial render isn't empty
  const parsedContent = useMemo(() => parse(data), [data])

  // Highlight after render when content is present
  useEffect(() => {
    if (!parsedContent || !containerRef.current) return
    // Use setTimeout to ensure DOM is ready after hydration
    const timer = setTimeout(() => {
      // Only highlight code blocks within this container
      const codeBlocks = containerRef.current?.querySelectorAll('pre code')
      if (codeBlocks) {
        codeBlocks.forEach((block) => {
          Prism.highlightElement(block as HTMLElement)
        })
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [parsedContent])

  return (
    <div 
      ref={containerRef}
      className={'markdown w-full min-w-full'} 
      suppressHydrationWarning
    >
      {parsedContent}
    </div>
  )
}

export default ParseHTML