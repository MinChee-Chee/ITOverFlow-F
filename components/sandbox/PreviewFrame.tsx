"use client"

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Language } from '@/constants/languages'

interface PreviewFrameProps {
  language: Language
  html: string
  css: string
  js: string
  output?: string
  error?: string
  isLoading?: boolean
  className?: string
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({
  language,
  html,
  css,
  js,
  output,
  error,
  isLoading,
  className,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Handle browser languages (HTML/CSS/JS)
  useEffect(() => {
    if (language.mode !== 'browser' || !iframeRef.current) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document

    if (!doc) return

    // Create the complete HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code Preview</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>
            // Wrap user code in try-catch to prevent errors from breaking the iframe
            try {
              ${js}
            } catch (error) {
              console.error('JavaScript Error:', error);
              const errorDiv = document.createElement('div');
              errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #fee; color: #c33; padding: 10px; border-bottom: 2px solid #c33; z-index: 10000; font-family: monospace;';
              errorDiv.textContent = 'Error: ' + error.message;
              document.body.appendChild(errorDiv);
            }
          </script>
        </body>
      </html>
    `

    // Write to iframe
    doc.open()
    doc.write(fullHtml)
    doc.close()
  }, [language, html, css, js])

  // For API languages, show output console
  if (language.mode === 'api') {
    return (
      <div
        className={cn(
          "h-full w-full bg-light-900 dark:bg-dark-300 rounded-lg border border-light-800 dark:border-dark-400 overflow-hidden flex flex-col",
          className
        )}
      >
        <div className="px-4 py-2 bg-light-800 dark:bg-dark-400 border-b border-light-800 dark:border-dark-400">
          <span className="text-sm font-medium text-dark-400 dark:text-light-700">
            Output
          </span>
        </div>
        <div className="flex-1 p-4 overflow-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-dark-400 dark:text-light-700 body-regular">
                Running code...
              </div>
            </div>
          ) : error ? (
            <pre className="font-mono text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
              {error}
            </pre>
          ) : output ? (
            <pre className="font-mono text-sm text-dark-400 dark:text-light-700 whitespace-pre-wrap break-words">
              {output}
            </pre>
          ) : (
            <div className="text-dark-500 dark:text-light-500 body-regular">
              Click &quot;Run Code&quot; to execute your {language.name} code
            </div>
          )}
        </div>
      </div>
    )
  }

  // For browser languages, show iframe
  return (
    <div
      className={cn(
        "h-full w-full bg-white dark:bg-dark-300 rounded-lg border border-light-800 dark:border-dark-400 overflow-hidden",
        className
      )}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        className="w-full h-full border-0"
        title="Code Preview"
        style={{ backgroundColor: 'white' }}
      />
    </div>
  )
}

export default PreviewFrame
