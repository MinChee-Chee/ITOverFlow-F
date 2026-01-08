"use client"

import React, { useEffect, useState, useRef } from 'react'
import CodeEditor from '@/components/sandbox/CodeEditor'
import PreviewFrame from '@/components/sandbox/PreviewFrame'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, RotateCcw, Trash2, Loader2 } from 'lucide-react'
import { SUPPORTED_LANGUAGES, getLanguageById } from '@/constants/languages'
import { Protect, useUser } from '@clerk/nextjs'
import Link from 'next/link'

// Default template code for HTML/CSS/JS
const DEFAULT_HTML = `<div class="container">
  <header>
    <h1>Welcome to the <span>Code Playground</span>!</h1>
    <p>Start coding below. Changes update in real-time.</p>
  </header>
  <button id="clickBtn">Run Interaction</button>
  <div id="output">Ready to execute JS...</div>
</div>`;

const DEFAULT_CSS = `/* Google Font import for a modern look */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;600;700&display=swap');

:root {
  --primary-color: #007bff; /* Bright blue */
  --secondary-color: #6c757d; /* Gray */
  --background-start: #f0f4f8; /* Light gray-blue */
  --background-end: #ffffff; /* White */
}

body {
  font-family: 'Poppins', sans-serif;
  margin: 0;
  padding: 0;
  background: var(--background-start);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align to the top for better viewing */
  padding-top: 50px;
}

.container {
  background: var(--background-end);
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 90%;
  text-align: center;
}

header h1 {
  color: #343a40;
  font-weight: 700;
  margin-bottom: 5px;
}

header h1 span {
  color: var(--primary-color);
}

header p {
  color: var(--secondary-color);
  margin-bottom: 30px;
  font-weight: 300;
}

button {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4);
}

button:hover {
  background: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.6);
}

#output {
  margin-top: 30px;
  padding: 15px;
  background: #e9ecef; /* Light background for output */
  border-left: 5px solid var(--primary-color);
  border-radius: 5px;
  text-align: left;
  min-height: 40px;
  color: #343a40;
}
`;

const DEFAULT_JS = `document.addEventListener('DOMContentLoaded', () => {
  const clickBtn = document.getElementById('clickBtn');
  const output = document.getElementById('output');

  // Initial welcome message
  output.textContent = 'Click the button to test the JavaScript!';

  clickBtn.addEventListener('click', function() {
    const messages = [
      'JavaScript executed successfully!',
      'Console.log() and DOM manipulation work!',
      'The sandbox is fully functional!',
      'Write your own logic here!'
    ];
    
    // Choose a random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Update the output div
    output.innerHTML = \`<p style="color: #007bff; font-weight: 600;">\${randomMessage}</p><small>Time: \${new Date().toLocaleTimeString()}</small>\`;
  });
});
`;

const SandboxPage = () => {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>('html-css-js')
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState(DEFAULT_JS)
  const [code, setCode] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPrivileged, setIsPrivileged] = useState(false) // admin or moderator
  const [roleLoading, setRoleLoading] = useState(true)
  const { isLoaded, isSignedIn } = useUser()
  const hasCheckedRole = useRef(false)

  const currentLanguage = getLanguageById(selectedLanguageId) || SUPPORTED_LANGUAGES[0]

  // Initialize code when language changes
  useEffect(() => {
    if (currentLanguage.mode === 'api' && !code) {
      setCode(currentLanguage.template)
    }
  }, [currentLanguage.id])

  // Check if user is admin or moderator to bypass subscription requirement
  useEffect(() => {
    // Wait for Clerk to be ready
    if (!isLoaded) return

    // Reset ref on mount to ensure fresh checks on navigation
    hasCheckedRole.current = false

    // Handle unauthenticated users
    if (!isSignedIn) {
      setRoleLoading(false)
      setIsPrivileged(false)
      return
    }

    // Reset and check role on each mount/navigation
    // This ensures fresh checks when navigating between pages
    setIsPrivileged(false)
    setRoleLoading(true)

    let isCancelled = false
    const checkRole = async () => {
      try {
        const response = await fetch('/api/auth/check-role', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        })
        
        // Check if cancelled before processing
        if (isCancelled) return
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn("Received non-JSON response from /api/auth/check-role:", contentType)
          if (!isCancelled) {
            setIsPrivileged(false)
            setRoleLoading(false)
          }
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          if (!isCancelled) {
            setIsPrivileged(data.isModerator === true || data.isAdmin === true)
            hasCheckedRole.current = true
          }
        } else {
          if (!isCancelled) {
            setIsPrivileged(false)
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error checking role for sandbox access:', error)
          setIsPrivileged(false)
        }
      } finally {
        if (!isCancelled) {
          setRoleLoading(false)
        }
      }
    }

    checkRole()
    
    // Cleanup function to cancel if component unmounts or dependencies change
    return () => {
      isCancelled = true
    }
  }, [isLoaded, isSignedIn])

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguageId(languageId)
    setOutput('')
    setError('')
    const newLang = getLanguageById(languageId)
    if (newLang && newLang.mode === 'api') {
      setCode(newLang.template)
    } else {
      setHtml(DEFAULT_HTML)
      setCss(DEFAULT_CSS)
      setJs(DEFAULT_JS)
    }
  }

  const handleRun = async () => {
    if (currentLanguage.mode === 'browser') {
      // Force iframe to re-render by changing key
      setPreviewKey((prev) => prev + 1)
      return
    }

    // Execute API-based languages
    setIsLoading(true)
    setOutput('')
    setError('')

    try {
      if (!currentLanguage.judge0Id) {
        throw new Error('Language not supported for execution')
      }

      const response = await fetch('/api/sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          languageId: currentLanguage.judge0Id,
          code: code,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setOutput(result.output || '')
        if (result.error) {
          setError(result.error)
        }
      } else {
        setError(result.error || 'Failed to execute code')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (currentLanguage.mode === 'browser') {
      setHtml(DEFAULT_HTML)
      setCss(DEFAULT_CSS)
      setJs(DEFAULT_JS)
      setPreviewKey((prev) => prev + 1)
    } else {
      setCode(currentLanguage.template)
      setOutput('')
      setError('')
    }
  }

  const handleClear = () => {
    if (currentLanguage.mode === 'browser') {
      setHtml('')
      setCss('')
      setJs('')
      setPreviewKey((prev) => prev + 1)
    } else {
      setCode('')
      setOutput('')
      setError('')
    }
  }

  // Avoid rendering until role check is done to prevent flicker
  if (roleLoading || !isLoaded) {
    return null
  }

  const sandboxContent = (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="h1-bold text-dark100_light900 mb-2">Code Sandbox</h1>
        <p className="text-dark500_light700 body-regular">
          Write and test code in multiple programming languages. Browser-native languages (HTML/CSS/JS) run in a secure iframe, 
          while other languages execute via Judge0 API service for secure, sandboxed execution.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedLanguageId} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full bg-light-900 dark:bg-dark-300 border-light-800 dark:border-dark-400 text-dark-900 dark:text-light-900">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent className="text-dark400_light700 small-regular border-none bg-light-900 dark:bg-dark-300">
              <SelectItem value="html-css-js">
                HTML/CSS/JS (Browser)
              </SelectItem>
              {SUPPORTED_LANGUAGES.filter(lang => lang.mode === 'api').map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.name} ({lang.version})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleRun} 
          className="bg-primary-500 hover:bg-primary-400"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Code
            </>
          )}
        </Button>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleClear} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-300px)] min-h-[600px]">
        {/* Code Editor Section */}
        <div className="flex flex-col h-full">
          <div className="mb-2">
            <h2 className="h3-semibold text-dark200_light900">Code Editor</h2>
          </div>
          <CodeEditor
            language={currentLanguage}
            html={html}
            css={css}
            js={js}
            code={code}
            onHtmlChange={setHtml}
            onCssChange={setCss}
            onJsChange={setJs}
            onCodeChange={setCode}
          />
        </div>

        {/* Preview Section */}
        <div className="flex flex-col h-full">
          <div className="mb-2">
            <h2 className="h3-semibold text-dark200_light900">
              {currentLanguage.mode === 'browser' ? 'Live Preview' : 'Output'}
            </h2>
          </div>
          <PreviewFrame
            key={previewKey}
            language={currentLanguage}
            html={html}
            css={css}
            js={js}
            output={output}
            error={error}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="mt-4 p-4 bg-light-800 dark:bg-dark-300 rounded-lg">
        <h3 className="h3-semibold text-dark200_light900 mb-2">About This Sandbox</h3>
        <ul className="small-regular text-dark500_light700 space-y-1 list-disc list-inside">
          <li>
            <strong>Browser Languages (HTML/CSS/JS):</strong> Execute directly in a secure, sandboxed iframe environment
          </li>
          <li>
            <strong>API Languages:</strong> Execute via Judge0 API service (Python, JavaScript, Java, C++, C, Rust, Go, PHP, Ruby, TypeScript, Swift, Kotlin, C#, Bash, SQL)
          </li>
          <li>Real-time preview for browser languages, instant output for API languages</li>
          <li>Your code is isolated and cannot access the parent page</li>
          <li>JavaScript errors are caught and displayed safely</li>
          <li>API execution includes compilation errors, runtime errors, and output</li>
          <li>Judge0 provides secure, sandboxed execution with time and memory limits</li>
        </ul>
      </div>
    </div>
  )

  // Admins and moderators can access sandbox without subscription
  if (isPrivileged) {
    return sandboxContent
  }

  // Other users must have the required plan
  return (
    <Protect
      plan="groupchat"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
            <Play className="h-10 w-10 text-primary-500" />
          </div>
          <h1 className="h2-bold text-dark100_light900 mb-3">Sandbox is premium</h1>
          <p className="text-dark500_light700 max-w-md mb-6">
            Sign in with an eligible plan to use the code sandbox, or upgrade to unlock this feature.
          </p>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button className="bg-primary-500 hover:bg-primary-400 px-6">View pricing</Button>
            </Link>
            {!isSignedIn && (
              <Link href="/sign-in">
                <Button variant="outline" className="px-6">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      }
    >
      {sandboxContent}
    </Protect>
  )
}

export default SandboxPage
