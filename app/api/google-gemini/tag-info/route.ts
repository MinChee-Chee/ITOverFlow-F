/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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

    // Try Hugging Face first (preferred)
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    if (hfApiKey) {
      try {
        const hf = new HfInference(hfApiKey);
        const modelsToTry = [
          'mistralai/Mistral-7B-Instruct-v0.2',
          'microsoft/Phi-3-mini-4k-instruct',
          'google/flan-t5-xxl',
        ];

        for (const model of modelsToTry) {
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

            // Handle different response formats
            let rawDescription: string | null = null;
            const responseAny = response as any;
            if (typeof responseAny === 'string') {
              rawDescription = responseAny.trim();
            } else if (responseAny && typeof responseAny === 'object') {
              if ('generated_text' in responseAny && typeof responseAny.generated_text === 'string') {
                rawDescription = responseAny.generated_text.trim();
              } else if ('text' in responseAny && typeof responseAny.text === 'string') {
                rawDescription = responseAny.text.trim();
              }
            }

            if (rawDescription) {
              const sentences = rawDescription.split(/[.!?]+/).filter(s => s.trim().length > 0);
              if (sentences.length > 0) {
                let description = sentences[0].trim();
                if (!description.match(/[.!?]$/)) {
                  description += '.';
                }
                description = description.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                
                if (description && description.length > 10) {
                  console.log(`[Tag Info] Successfully used Hugging Face model: ${model}`);
                  return NextResponse.json({ description }, {
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
        console.log(`[Tag Info] Hugging Face failed:`, err.message);
        // Don't fall back to Gemini if Hugging Face is configured - avoid quota issues
        if (hfApiKey) {
          return NextResponse.json(
            { error: `Hugging Face API failed: ${err.message}. Please check your API key and model availability.` },
            { status: 500 }
          );
        }
      }
    }

    // Only use Gemini if Hugging Face is NOT configured
    const geminiApiKey = process.env.TAG_GOOGLE_GEMINI || process.env.GOOGLE_GEMINI_API_KEY_TAG;
    
    // If Hugging Face is configured, never use Gemini (to avoid quota issues)
    if (hfApiKey) {
      return NextResponse.json(
        { error: 'Hugging Face API is configured. Please use /api/huggingface/tag-info endpoint instead, or configure Hugging Face API key properly.' },
        { status: 500 }
      );
    }
    
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Neither Hugging Face nor Google Gemini API key is configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-pro-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ];

    let lastError: any = null;
    let description: string | null = null;

    for (const model of modelsToTry) {
      try {
        console.log(`[Tag Info] Trying model: ${model} for tag: ${tagName}`);
        
        const response = await ai.models.generateContent({
          model,
          contents: `You are a helpful technical assistant that provides clear and concise descriptions of programming technologies and tags.\n\n${prompt}`,
        });

        if (response.text) {
          let rawDescription = response.text.trim();
          
          // Ensure only one sentence - take the first sentence if multiple exist
          const sentences = rawDescription.split(/[.!?]+/).filter(s => s.trim().length > 0);
          if (sentences.length > 0) {
            description = sentences[0].trim();
            // Add period if it doesn't end with punctuation
            if (!description.match(/[.!?]$/)) {
              description += '.';
            }
          } else {
            description = rawDescription;
          }
          
          console.log(`[Tag Info] Successfully used model: ${model}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errorMessage = err.message || err.toString();
        console.log(`[Tag Info] Model ${model} failed:`, errorMessage);
        
        if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
          const quotaMessage = 'Google Gemini API quota exceeded. Please check your quota limits.';
          return NextResponse.json({ error: quotaMessage }, { status: 429 });
        }
      }
    }

    if (!description) {
      if (lastError) {
        const errorMessage = lastError.message || 'All model configurations failed';
        return NextResponse.json(
          { error: `Failed to generate tag information: ${errorMessage}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to generate tag information' },
        { status: 500 }
      );
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
    console.error('[Tag Info] Google Gemini API Error:', error);
    
    let errorMessage = error.message || 'Failed to generate tag information';
    
    if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
      errorMessage = 'Google Gemini API quota exceeded. Please check your quota limits.';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
      errorMessage = 'Google Gemini API rate limit exceeded. Please try again in a moment.';
    } else if (errorMessage.includes('API_KEY') || errorMessage.includes('UNAUTHENTICATED')) {
      errorMessage = 'Invalid Google Gemini API key. Please check your API key configuration.';
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
