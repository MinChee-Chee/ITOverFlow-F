"use client"

import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Language } from '@/constants/languages'

interface CodeEditorProps {
  language: Language
  html: string
  css: string
  js: string
  code: string
  onHtmlChange: (value: string) => void
  onCssChange: (value: string) => void
  onJsChange: (value: string) => void
  onCodeChange: (value: string) => void
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  html,
  css,
  js,
  code,
  onHtmlChange,
  onCssChange,
  onJsChange,
  onCodeChange,
}) => {
  // For browser languages (HTML/CSS/JS), show tabs
  if (language.mode === 'browser') {
    return (
      <div className="h-full flex flex-col bg-light-900 dark:bg-dark-300 rounded-lg border border-light-800 dark:border-dark-400">
        <Tabs defaultValue="html" className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none rounded-t-lg bg-light-800 dark:bg-dark-400 p-0 h-auto">
            <TabsTrigger
              value="html"
              className="tab rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500"
            >
              HTML
            </TabsTrigger>
            <TabsTrigger
              value="css"
              className="tab rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500"
            >
              CSS
            </TabsTrigger>
            <TabsTrigger
              value="js"
              className="tab rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500"
            >
              JavaScript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="flex-1 m-0 mt-0 p-4 overflow-hidden">
            <Textarea
              value={html}
              onChange={(e) => onHtmlChange(e.target.value)}
              className={cn(
                "w-full h-full font-mono text-sm resize-none",
                "bg-light-900 dark:bg-dark-300",
                "text-dark-400 dark:text-light-700",
                "border-light-800 dark:border-dark-400",
                "focus-visible:ring-primary-500",
                "custom-scrollbar"
              )}
              placeholder="<!-- Write your HTML here -->"
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="css" className="flex-1 m-0 mt-0 p-4 overflow-hidden">
            <Textarea
              value={css}
              onChange={(e) => onCssChange(e.target.value)}
              className={cn(
                "w-full h-full font-mono text-sm resize-none",
                "bg-light-900 dark:bg-dark-300",
                "text-dark-400 dark:text-light-700",
                "border-light-800 dark:border-dark-400",
                "focus-visible:ring-primary-500",
                "custom-scrollbar"
              )}
              placeholder="/* Write your CSS here */"
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="js" className="flex-1 m-0 mt-0 p-4 overflow-hidden">
            <Textarea
              value={js}
              onChange={(e) => onJsChange(e.target.value)}
              className={cn(
                "w-full h-full font-mono text-sm resize-none",
                "bg-light-900 dark:bg-dark-300",
                "text-dark-400 dark:text-light-700",
                "border-light-800 dark:border-dark-400",
                "focus-visible:ring-primary-500",
                "custom-scrollbar"
              )}
              placeholder="// Write your JavaScript here"
              spellCheck={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // For API languages, show single code editor
  return (
    <div className="h-full flex flex-col bg-light-900 dark:bg-dark-300 rounded-lg border border-light-800 dark:border-dark-400">
      <div className="px-4 py-2 bg-light-800 dark:bg-dark-400 border-b border-light-800 dark:border-dark-400">
        <span className="text-sm font-medium text-dark-400 dark:text-light-700">
          {language.name} ({language.version})
        </span>
      </div>
      <div className="flex-1 p-4 overflow-hidden">
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          className={cn(
            "w-full h-full font-mono text-sm resize-none",
            "bg-light-900 dark:bg-dark-300",
            "text-dark-400 dark:text-light-700",
            "border-light-800 dark:border-dark-400",
            "focus-visible:ring-primary-500",
            "custom-scrollbar"
          )}
          placeholder={`// Write your ${language.name} code here`}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

export default CodeEditor
