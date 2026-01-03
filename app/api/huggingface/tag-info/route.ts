/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";

export const POST = async (request: NextRequest) => {
  try {
    const { tagName } = await request.json();

    if (!tagName || typeof tagName !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const tagLower = tagName.toLowerCase();
    let description: string | null = null;

    const prompt = `Provide a very short, single sentence description about the programming/technology tag "${tagName}". 

Requirements:
- ONE sentence only (10-20 words maximum - be as concise as possible)
- Briefly explain what it is in the simplest way
- Keep it extremely short and beginner-friendly
- No markdown formatting, just plain text
- Do not use multiple sentences, line breaks, or extra words
- Example format: "React is a JavaScript library for building user interfaces."

Tag: ${tagName}
Description:`;

    // Try Hugging Face API first
    const hfApiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
    if (hfApiKey) {
      try {
        const hf = new HfInference(hfApiKey);
        
        // Models that support conversational/chat (more reliable on free tier)
        const chatModels = [
          'mistralai/Mistral-7B-Instruct-v0.2',
          'HuggingFaceH4/zephyr-7b-beta',
          'microsoft/Phi-3-mini-4k-instruct',
        ];
        
        // Models that support text-generation (try smaller models first)
        const textGenModels = [
          'google/flan-t5-base',  // Smaller, more likely to be available
          'gpt2',  // Very basic but usually available
        ];

        // Try chat models first (more reliable)
        for (const model of chatModels) {
          try {
            console.log(`[Tag Info] Trying Hugging Face chat model: ${model} for tag: ${tagName}`);
            
            const response = await hf.chatCompletion({
              model,
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful technical assistant that provides clear and concise descriptions of programming technologies and tags.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              max_tokens: 50,
              temperature: 0.7,
            });

            // Handle chat completion response
            let rawDescription: string | null = null;
            const responseAny = response as any;
            if (responseAny && typeof responseAny === 'object') {
              if ('choices' in responseAny && Array.isArray(responseAny.choices) && responseAny.choices.length > 0) {
                const choice = responseAny.choices[0];
                if (choice && typeof choice === 'object' && 'message' in choice) {
                  const message = (choice as any).message;
                  if (message && typeof message === 'object' && 'content' in message && typeof message.content === 'string') {
                    rawDescription = message.content.trim();
                  }
                }
              } else if ('generated_text' in responseAny && typeof responseAny.generated_text === 'string') {
                rawDescription = responseAny.generated_text.trim();
              } else if ('text' in responseAny && typeof responseAny.text === 'string') {
                rawDescription = responseAny.text.trim();
              }
            }

            if (rawDescription) {
              const sentences = rawDescription.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
              if (sentences.length > 0) {
                let generatedDescription = sentences[0].trim();
                if (!generatedDescription.match(/[.!?]$/)) {
                  generatedDescription += '.';
                }
                generatedDescription = generatedDescription.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                
                if (generatedDescription && generatedDescription.length > 10) {
                  console.log(`[Tag Info] Successfully used Hugging Face chat model: ${model}`);
                  return NextResponse.json({ description: generatedDescription }, {
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
              }
            }
          } catch (err: any) {
            console.log(`[Tag Info] Hugging Face chat model ${model} failed:`, err.message);
            continue;
          }
        }

        // Try text-generation models as fallback
        for (const model of textGenModels) {
          try {
            console.log(`[Tag Info] Trying Hugging Face model: ${model} for tag: ${tagName}`);
            
            const response = await hf.textGeneration({
              model,
              inputs: `You are a helpful technical assistant that provides clear and concise descriptions of programming technologies and tags.\n\n${prompt}`,
              parameters: {
                max_new_tokens: 50,
                temperature: 0.7,
                return_full_text: false,
              },
            });

            // Handle different response formats from textGeneration
            // Can return: string, object with generated_text, or array of objects
            let rawDescription: string | null = null;
            const responseAny = response as any;
            
            if (typeof responseAny === 'string') {
              // Direct string response (default behavior)
              rawDescription = responseAny.trim();
            } else if (Array.isArray(responseAny) && responseAny.length > 0) {
              // Array response - get first element
              const firstItem = responseAny[0];
              if (typeof firstItem === 'string') {
                rawDescription = firstItem.trim();
              } else if (firstItem && typeof firstItem === 'object') {
                if ('generated_text' in firstItem && typeof firstItem.generated_text === 'string') {
                  rawDescription = firstItem.generated_text.trim();
                } else if ('text' in firstItem && typeof firstItem.text === 'string') {
                  rawDescription = firstItem.text.trim();
                }
              }
            } else if (responseAny && typeof responseAny === 'object') {
              // Object response - check for generated_text or text property
              if ('generated_text' in responseAny && typeof responseAny.generated_text === 'string') {
                rawDescription = responseAny.generated_text.trim();
              } else if ('text' in responseAny && typeof responseAny.text === 'string') {
                rawDescription = responseAny.text.trim();
              } else if (responseAny[0] && typeof responseAny[0] === 'object' && 'generated_text' in responseAny[0]) {
                // Nested array-like structure
                rawDescription = responseAny[0].generated_text?.trim() || null;
              }
            }
            
            // Log response structure for debugging if no description found
            if (!rawDescription) {
              console.log(`[Tag Info] Unexpected response format from ${model}:`, JSON.stringify(responseAny).substring(0, 200));
            }

            if (rawDescription) {
              const sentences = rawDescription.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
              if (sentences.length > 0) {
                let generatedDescription = sentences[0].trim();
                if (!generatedDescription.match(/[.!?]$/)) {
                  generatedDescription += '.';
                }
                generatedDescription = generatedDescription.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                
                if (generatedDescription && generatedDescription.length > 10) {
                  console.log(`[Tag Info] Successfully used Hugging Face model: ${model}`);
                  return NextResponse.json({ description: generatedDescription }, {
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
              }
            }
          } catch (err: any) {
            console.log(`[Tag Info] Hugging Face model ${model} failed:`, err.message);
            continue;
          }
        }
      } catch (err: any) {
        console.log(`[Tag Info] Hugging Face SDK failed:`, err.message);
        
        // Try direct HTTP API call as fallback (using Inference Endpoints)
        try {
          console.log(`[Tag Info] Trying direct HTTP API call for tag: ${tagName}`);
          const httpResponse = await fetch(
            `https://api-inference.huggingface.co/models/gpt2`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: prompt,
                parameters: {
                  max_new_tokens: 50,
                  temperature: 0.7,
                  return_full_text: false,
                },
              }),
            }
          );

          if (!httpResponse.ok) {
            throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
          }

          if (httpResponse.ok) {
            const httpData = await httpResponse.json();
            if (Array.isArray(httpData) && httpData.length > 0 && httpData[0].generated_text) {
              let rawDescription = httpData[0].generated_text.trim();
              const sentences = rawDescription.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
              if (sentences.length > 0) {
                let generatedDescription = sentences[0].trim();
                if (!generatedDescription.match(/[.!?]$/)) {
                  generatedDescription += '.';
                }
                generatedDescription = generatedDescription.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                
                if (generatedDescription && generatedDescription.length > 10) {
                  console.log(`[Tag Info] Successfully used direct HTTP API`);
                  return NextResponse.json({ description: generatedDescription }, {
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
              }
            }
          }
        } catch (httpErr: any) {
          console.log(`[Tag Info] Direct HTTP API also failed:`, httpErr.message);
          // Fall through to use hardcoded descriptions
        }
      }
    } else {
      console.log(`[Tag Info] Hugging Face API key not configured, using fallback descriptions`);
    }

    // Comprehensive fallback descriptions for common tags
    const commonDescriptions: Record<string, string> = {
      'javascript': 'JavaScript is a programming language used for web development.',
      'python': 'Python is a high-level programming language known for its simplicity.',
      'java': 'Java is an object-oriented programming language used for enterprise applications.',
      'react': 'React is a JavaScript library for building user interfaces.',
      'nodejs': 'Node.js is a JavaScript runtime for server-side development.',
      'typescript': 'TypeScript is a typed superset of JavaScript.',
      'html': 'HTML is the markup language for creating web pages.',
      'css': 'CSS is a stylesheet language for styling web pages.',
      'vue': 'Vue is a progressive JavaScript framework for building UIs.',
      'angular': 'Angular is a TypeScript-based web application framework.',
      'git': 'Git is a distributed version control system for tracking changes in code.',
      'version-control': 'Version control is a system for managing changes to files over time.',
      'git-pull': 'Git pull downloads and merges changes from a remote repository.',
      'git-push': 'Git push uploads local commits to a remote repository.',
      'git-branch': 'A git branch is an independent line of development in a repository.',
      'git-commit': 'A git commit saves a snapshot of changes to the repository.',
      'git-merge': 'Git merge combines changes from different branches.',
      'git-fetch': 'Git fetch downloads changes from a remote without merging.',
      'git-clone': 'Git clone creates a copy of a remote repository locally.',
      'git-rebase': 'Git rebase reapplies commits on top of another base branch.',
      'git-stash': 'Git stash temporarily saves uncommitted changes.',
      'docker': 'Docker is a platform for containerizing and deploying applications.',
      'kubernetes': 'Kubernetes is an orchestration platform for managing containerized applications.',
      'mongodb': 'MongoDB is a NoSQL database for storing document-oriented data.',
      'mysql': 'MySQL is a relational database management system.',
      'postgresql': 'PostgreSQL is an open-source relational database system.',
      'redis': 'Redis is an in-memory data structure store used as a database and cache.',
      'aws': 'AWS is Amazon Web Services, a cloud computing platform.',
      'azure': 'Azure is Microsoft\'s cloud computing platform.',
      'gcp': 'GCP is Google Cloud Platform, a suite of cloud computing services.',
      'linux': 'Linux is an open-source operating system kernel.',
      'bash': 'Bash is a Unix shell and command language.',
      'c++': 'C++ is a general-purpose programming language with object-oriented features.',
      'c': 'C is a procedural programming language for system programming.',
      'csharp': 'C# is a Microsoft programming language for .NET applications.',
      'go': 'Go is a statically typed programming language developed by Google.',
      'rust': 'Rust is a systems programming language focused on safety and performance.',
      'php': 'PHP is a server-side scripting language for web development.',
      'ruby': 'Ruby is a dynamic programming language known for its simplicity.',
      'swift': 'Swift is Apple\'s programming language for iOS and macOS development.',
      'kotlin': 'Kotlin is a modern programming language for Android and JVM development.',
      'nextjs': 'Next.js is a React framework for building full-stack web applications.',
      'express': 'Express is a minimal web framework for Node.js.',
      'nestjs': 'NestJS is a progressive Node.js framework for building efficient applications.',
      'django': 'Django is a high-level Python web framework.',
      'flask': 'Flask is a lightweight Python web framework.',
      'spring': 'Spring is a Java framework for building enterprise applications.',
      'laravel': 'Laravel is a PHP web framework with elegant syntax.',
      // Programming concepts
      'program-entry-point': 'A program entry point is the location where a program begins execution, typically the main() function or __main__ block in Python.',
      'entry-point': 'An entry point is the location where a program begins execution when it is run.',
      'comments': 'Comments are explanatory text in source code that are ignored by the compiler or interpreter, used to document code for developers.',
      'namespaces': 'Namespaces are a way to organize code and prevent naming conflicts by grouping related identifiers under a common name.',
      'python-module': 'A Python module is a file containing Python definitions and statements that can be imported and used in other Python programs.',
      'module': 'A module is a self-contained unit of code that can be imported and reused in other parts of a program.',
      'idioms': 'Programming idioms are common patterns or conventions used in a particular programming language to solve recurring problems.',
      'idiom': 'A programming idiom is a common pattern or convention used in a particular language to solve recurring problems.',
      'ajax': 'AJAX (Asynchronous JavaScript and XML) is a technique for creating interactive web applications that update content without reloading the page.',
      'reactjs': 'React.js is a JavaScript library for building user interfaces, particularly single-page applications.',
    };

    // Fallback to hardcoded descriptions if Hugging Face API failed or is not configured
    // Check exact match first
    if (commonDescriptions[tagLower]) {
      description = commonDescriptions[tagLower];
      console.log(`[Tag Info] Using fallback description for: ${tagName}`);
    } else {
      // Generate a more informative description based on tag patterns
      let generatedDescription = '';
      
      // Pattern-based generation for unknown tags
      // Programming concepts first (before technology patterns)
      if (tagLower.includes('entry-point') || tagLower.includes('entrypoint') || tagLower === 'main') {
        generatedDescription = `${tagName} refers to the entry point of a program, where execution begins when the program is run.`;
      } else if (tagLower === 'comments' || tagLower === 'comment') {
        generatedDescription = `${tagName} are explanatory notes in source code that document functionality and are ignored by compilers or interpreters.`;
      } else if (tagLower === 'namespaces' || tagLower === 'namespace') {
        generatedDescription = `${tagName} are scoping mechanisms that organize code and prevent naming conflicts by grouping related identifiers.`;
      } else if (tagLower.includes('module') && (tagLower.includes('python') || tagLower.includes('py'))) {
        generatedDescription = `${tagName} is a Python module, a file containing Python code that can be imported and reused in other programs.`;
      } else if (tagLower === 'module' || tagLower === 'modules') {
        generatedDescription = `${tagName} are self-contained units of code that can be imported and reused across different parts of a program.`;
      } else if (tagLower === 'idioms' || tagLower === 'idiom') {
        generatedDescription = `${tagName} are common patterns or conventions in a programming language used to solve recurring problems elegantly.`;
      } else if (tagLower.includes('variable') || tagLower.includes('var') || tagLower.includes('const') || tagLower.includes('let')) {
        generatedDescription = `${tagName} refers to a programming concept for storing and referencing data values in code.`;
      } else if (tagLower.includes('function') || tagLower.includes('method') || tagLower.includes('procedure')) {
        generatedDescription = `${tagName} is a programming concept representing a reusable block of code that performs a specific task.`;
      } else if (tagLower.includes('class') || tagLower.includes('object') || tagLower.includes('instance')) {
        generatedDescription = `${tagName} is an object-oriented programming concept for organizing code into reusable structures.`;
      } else if (tagLower.includes('import') || tagLower.includes('export') || tagLower.includes('require')) {
        generatedDescription = `${tagName} is a programming mechanism for including external code or modules into a program.`;
      } else if (tagLower.includes('loop') || tagLower.includes('iteration') || tagLower.includes('for') || tagLower.includes('while')) {
        generatedDescription = `${tagName} is a programming control structure for repeating code execution.`;
      } else if (tagLower.includes('condition') || tagLower.includes('if') || tagLower.includes('else') || tagLower.includes('switch')) {
        generatedDescription = `${tagName} is a programming control structure for making decisions and branching code execution.`;
      } else if (tagLower.includes('exception') || tagLower.includes('error') || tagLower.includes('try') || tagLower.includes('catch')) {
        generatedDescription = `${tagName} is a programming mechanism for handling errors and exceptional conditions in code.`;
      } else if (tagLower.includes('array') || tagLower.includes('list') || tagLower.includes('collection')) {
        generatedDescription = `${tagName} is a data structure for storing multiple values in a single variable.`;
      } else if (tagLower.includes('string') || tagLower.includes('text')) {
        generatedDescription = `${tagName} is a data type representing sequences of characters in programming.`;
      } else if (tagLower.includes('integer') || tagLower.includes('int') || tagLower.includes('number') || tagLower.includes('float')) {
        generatedDescription = `${tagName} is a numeric data type used in programming for mathematical operations.`;
      } else if (tagLower.includes('boolean') || tagLower === 'bool') {
        generatedDescription = `${tagName} is a data type that represents true or false values in programming.`;
      } else if (tagLower.startsWith('git-')) {
        generatedDescription = `${tagName} is a Git command or concept related to version control.`;
      } else if (tagLower.includes('api') || tagLower.includes('rest') || tagLower.includes('graphql')) {
        generatedDescription = `${tagName} is an API or interface technology used for communication between systems.`;
      } else if (tagLower.includes('test') || tagLower.includes('spec')) {
        generatedDescription = `${tagName} is a testing framework or tool for software quality assurance.`;
      } else if (tagLower.includes('css') || tagLower.includes('style') || tagLower.includes('sass') || tagLower.includes('less')) {
        generatedDescription = `${tagName} is a styling or CSS-related technology for web design.`;
      } else if (tagLower.includes('js') || tagLower.includes('javascript') || tagLower.includes('ts') || tagLower.includes('typescript')) {
        generatedDescription = `${tagName} is a JavaScript or TypeScript related technology or library.`;
      } else if (tagLower.includes('react') || tagLower.includes('vue') || tagLower.includes('angular') || tagLower.includes('svelte')) {
        generatedDescription = `${tagName} is a frontend framework or library for building user interfaces.`;
      } else if (tagLower.includes('node') || tagLower.includes('express') || tagLower.includes('server')) {
        generatedDescription = `${tagName} is a backend or server-side technology for web development.`;
      } else if (tagLower.includes('db') || tagLower.includes('database') || tagLower.includes('sql') || tagLower.includes('nosql')) {
        generatedDescription = `${tagName} is a database technology or data storage solution.`;
      } else if (tagLower.includes('cloud') || tagLower.includes('aws') || tagLower.includes('azure') || tagLower.includes('gcp')) {
        generatedDescription = `${tagName} is a cloud computing service or platform.`;
      } else if (tagLower.includes('docker') || tagLower.includes('container') || tagLower.includes('kubernetes')) {
        generatedDescription = `${tagName} is a containerization or orchestration technology.`;
      } else if (tagLower.includes('security') || tagLower.includes('auth') || tagLower.includes('oauth') || tagLower.includes('jwt')) {
        generatedDescription = `${tagName} is a security or authentication related technology.`;
      } else if (tagLower.includes('devops') || tagLower.includes('ci') || tagLower.includes('cd') || tagLower.includes('deploy')) {
        generatedDescription = `${tagName} is a DevOps or deployment automation tool.`;
      } else if (tagLower.includes('mobile') || tagLower.includes('ios') || tagLower.includes('android') || tagLower.includes('react-native')) {
        generatedDescription = `${tagName} is a mobile development technology or framework.`;
      } else if (tagLower.includes('machine-learning') || tagLower.includes('ml') || tagLower.includes('ai') || tagLower.includes('neural')) {
        generatedDescription = `${tagName} is a machine learning or artificial intelligence technology.`;
      } else if (tagLower.includes('web') || tagLower.includes('html') || tagLower.includes('frontend')) {
        generatedDescription = `${tagName} is a web development technology or tool.`;
      } else if (tagLower.includes('backend') || tagLower.includes('server') || tagLower.includes('api')) {
        generatedDescription = `${tagName} is a backend development technology or service.`;
      } else {
        // More informative generic fallback
        const words = tagName.split(/[-_]/).filter(w => w.length > 0);
        if (words.length > 1) {
          // For compound tags, try to infer
          const firstWord = words[0].toLowerCase();
          const lastWord = words[words.length - 1].toLowerCase();
          
          if (firstWord === 'react' || firstWord === 'vue' || firstWord === 'angular') {
            generatedDescription = `${tagName} is a ${firstWord}-based library or component.`;
          } else if (lastWord === 'js' || lastWord === 'ts') {
            generatedDescription = `${tagName} is a ${lastWord === 'js' ? 'JavaScript' : 'TypeScript'} library or framework.`;
          } else {
            generatedDescription = `${tagName} is a technology or tool used in software development, likely related to ${words[0]}.`;
          }
        } else {
          // Single word - generic but informative
          generatedDescription = `${tagName} is a technology, tool, or concept used in software development.`;
        }
      }
      
      description = generatedDescription;
      console.log(`[Tag Info] Using generated description for: ${tagName}`);
    }

    return NextResponse.json(
      { description },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error: any) {
    console.error('[Tag Info] Error:', error);
    
    let errorMessage = error.message || 'Failed to generate tag information';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
