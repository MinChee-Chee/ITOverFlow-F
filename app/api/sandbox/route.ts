import { NextResponse } from 'next/server'

interface ExecuteRequest {
  languageId: number
  code: string
  stdin?: string
}

// Judge0 status IDs
const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 7,
  RUNTIME_ERROR_SIGSEGV: 8,
  RUNTIME_ERROR_SIGXFSZ: 9,
  RUNTIME_ERROR_SIGFPE: 10,
  RUNTIME_ERROR_SIGABRT: 11,
  RUNTIME_ERROR_NZEC: 12,
  RUNTIME_ERROR_OTHER: 13,
  INTERNAL_ERROR: 14,
  EXEC_FORMAT_ERROR: 15,
}

const getStatusDescription = (statusId: number): string => {
  const statusMap: Record<number, string> = {
    1: 'In Queue',
    2: 'Processing',
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error',
    8: 'Runtime Error (SIGSEGV)',
    9: 'Runtime Error (SIGXFSZ)',
    10: 'Runtime Error (SIGFPE)',
    11: 'Runtime Error (SIGABRT)',
    12: 'Runtime Error (NZEC)',
    13: 'Runtime Error (Other)',
    14: 'Internal Error',
    15: 'Exec Format Error',
  }
  return statusMap[statusId] || 'Unknown Status'
}

export async function POST(request: Request) {
  try {
    const body: ExecuteRequest = await request.json()
    const { languageId, code, stdin = '' } = body

    if (!languageId || !code) {
      return NextResponse.json(
        { error: 'Language ID and code are required' },
        { status: 400 }
      )
    }

    // Get RapidAPI key from environment
    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json(
        { error: 'RAPIDAPI_KEY environment variable is not set' },
        { status: 500 }
      )
    }

    // Judge0 API endpoint via RapidAPI
    const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com'

    // Step 1: Create a submission
    const createResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: stdin,
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Judge0 API error: ${createResponse.status} - ${errorText}`)
    }

    const submission = await createResponse.json()
    const token = submission.token

    if (!token) {
      throw new Error('Failed to get submission token')
    }

    // Step 2: Poll for results (with timeout)
    const maxAttempts = 30
    const pollInterval = 1000 // 1 second
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval))

      const statusResponse = await fetch(
        `${JUDGE0_API_URL}/submissions/${token}`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        }
      )

      if (!statusResponse.ok) {
        throw new Error(`Failed to get submission status: ${statusResponse.status}`)
      }

      const result = await statusResponse.json()

      // Check if processing is complete
      const statusId = result.status?.id
      if (statusId && statusId !== JUDGE0_STATUS.IN_QUEUE && statusId !== JUDGE0_STATUS.PROCESSING) {
        // Processing complete
        const isSuccess = statusId === JUDGE0_STATUS.ACCEPTED
        const output = result.stdout || ''
        const error = result.stderr || result.compile_output || ''
        const statusDescription = getStatusDescription(statusId)

        // If there's a compilation error or runtime error, show it
        let errorMessage = ''
        if (!isSuccess) {
          if (result.compile_output) {
            errorMessage = `Compilation Error:\n${result.compile_output}`
          } else if (result.stderr) {
            errorMessage = `Runtime Error:\n${result.stderr}`
          } else if (result.message) {
            errorMessage = `${statusDescription}:\n${result.message}`
          } else {
            errorMessage = statusDescription
          }
        }

        return NextResponse.json(
          {
            success: isSuccess,
            output: output,
            error: errorMessage || error,
            exitCode: result.status?.id || 0,
            status: statusDescription,
            time: result.time,
            memory: result.memory,
          },
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }

      attempts++
    }

    // Timeout
    return NextResponse.json(
      {
        success: false,
        error: 'Execution timeout: The code took too long to execute',
        output: '',
      },
      {
        status: 408,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error: unknown) {
    console.error('Error executing code:', error)
    const message = error instanceof Error ? error.message : 'Failed to execute code'

    return NextResponse.json(
      {
        success: false,
        error: message,
        output: '',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
