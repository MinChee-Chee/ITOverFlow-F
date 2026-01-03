/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { HfInference } from "@huggingface/inference";
import { GoogleGenAI } from "@google/genai";

export const POST = async (request: NextRequest) => {
  try {
    const { tagName } = await request.json();

    if (!tagName || typeof tagName !== "string") {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const hfApiKey =
      process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;

    if (!hfApiKey) {
      return NextResponse.json(
        { error: "Hugging Face API key is not configured" },
        { status: 500 }
      );
    }

    const prompt = `Explain the programming or technology tag "${tagName}" in ONE short sentence (10–20 words max).
                    Beginner-friendly. No markdown. No extra text.
                    Example: "React is a JavaScript library for building user interfaces."`;

    let description: string | null = null;

    // Try Hugging Face using router endpoint with explicit providers
    if (hfApiKey) {
      // Approach 1: Use Hugging Face Router API with explicit providers (most reliable)
      // This uses the router endpoint that handles provider selection automatically
      const routerModels = [
        { model: 'HuggingFaceH4/zephyr-7b-beta', provider: 'featherless-ai' },
        { model: 'mistralai/Mistral-7B-Instruct-v0.2', provider: 'featherless-ai' },
        { model: 'HuggingFaceH4/zephyr-7b-beta', provider: 'auto' },
        { model: 'mistralai/Mistral-7B-Instruct-v0.2', provider: 'auto' },
      ];

      for (const { model, provider } of routerModels) {
        try {
          const modelWithProvider = provider === 'auto' ? model : `${model}:${provider}`;
          console.log(`[Tag Info] Trying Hugging Face Router API: ${modelWithProvider} → ${tagName}`);

          const routerResponse = await fetch(
            `https://router.huggingface.co/v1/chat/completions`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hfApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: modelWithProvider,
                messages: [
                  {
                    role: "system",
                    content: "You explain programming and technology tags in one short, clear sentence.",
                  },
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
                max_tokens: 50,
                temperature: 0.3,
              }),
            }
          );

          if (routerResponse.ok) {
            const routerData = await routerResponse.json();
            let raw: string = "";

            if (routerData?.choices?.[0]?.message?.content) {
              raw = routerData.choices[0].message.content.trim();
            } else if (routerData?.message?.content) {
              raw = routerData.message.content.trim();
            }

            if (raw && raw.length >= 10) {
              const sentence = raw
                .replace(/\*/g, "")
                .replace(/\*\*/g, "")
                .split(/[.!?]/)[0]
                .trim();

              if (sentence.length >= 10) {
                description = sentence.endsWith(".")
                  ? sentence
                  : sentence + ".";
                console.log(`[Tag Info] Successfully used Hugging Face Router API (${modelWithProvider}) for: ${tagName}`);
                break;
              }
            }
          } else {
            const errorData = await routerResponse.text();
            console.log(`[Tag Info] Hugging Face Router API (${modelWithProvider}) HTTP ${routerResponse.status}:`, errorData.substring(0, 100));
          }
        } catch (err: any) {
          console.log(`[Tag Info] Hugging Face Router API (${model}:${provider}) failed:`, err.message);
          continue;
        }
      }

      // Approach 2: Try direct Inference API with text-generation models
      if (!description) {
        const textGenModels = [
          'gpt2',
          'distilgpt2',
          'google/flan-t5-base',
        ];

        for (const model of textGenModels) {
          try {
            console.log(`[Tag Info] Trying Hugging Face Inference API: ${model} → ${tagName}`);
            
            const inferenceResponse = await fetch(
              `https://api-inference.huggingface.co/models/${model}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${hfApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  inputs: `Tag: ${tagName}. ${prompt}`,
                  parameters: {
                    max_new_tokens: 50,
                    temperature: 0.7,
                    return_full_text: false,
                  },
                }),
              }
            );

            if (inferenceResponse.ok) {
              const inferenceData = await inferenceResponse.json();
              let rawDescription: string | null = null;

              if (Array.isArray(inferenceData) && inferenceData.length > 0) {
                if (inferenceData[0].generated_text) {
                  rawDescription = inferenceData[0].generated_text.trim();
                }
              } else if (inferenceData.generated_text) {
                rawDescription = inferenceData.generated_text.trim();
              }

              if (rawDescription && rawDescription.length >= 10) {
                const sentence = rawDescription
                  .replace(/\*/g, "")
                  .split(/[.!?]/)[0]
                  .trim();

                if (sentence.length >= 10) {
                  description = sentence.endsWith(".")
                    ? sentence
                    : sentence + ".";
                  console.log(`[Tag Info] Successfully used Hugging Face Inference API (${model}) for: ${tagName}`);
                  break;
                }
              }
            } else {
              const errorData = await inferenceResponse.text();
              console.log(`[Tag Info] Hugging Face Inference API (${model}) HTTP ${inferenceResponse.status}:`, errorData.substring(0, 100));
            }
          } catch (err: any) {
            console.log(`[Tag Info] Hugging Face Inference API (${model}) failed:`, err.message);
            continue;
          }
        }
      }
    }

    // Fallback to Google Gemini if Hugging Face failed
    if (!description) {
      const geminiApiKey = process.env.TAG_GOOGLE_GEMINI || process.env.GOOGLE_GEMINI_API_KEY_TAG || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      
      if (geminiApiKey) {
        try {
          console.log(`[Tag Info] Trying Google Gemini as fallback → ${tagName}`);
          const ai = new GoogleGenAI({
            apiKey: geminiApiKey,
          });

          const geminiModelsToTry = [
            'gemini-2.5-flash',
            'gemini-2.5-pro-exp',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
          ];

          for (const model of geminiModelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model,
                contents: `You are a helpful technical assistant that provides clear and concise descriptions of programming technologies and tags.\n\n${prompt}`,
              });

              if (response.text) {
                let rawDescription = response.text.trim();
                const sentences = rawDescription.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
                if (sentences.length > 0) {
                  let generatedDescription = sentences[0].trim();
                  if (!generatedDescription.match(/[.!?]$/)) {
                    generatedDescription += '.';
                  }
                  generatedDescription = generatedDescription.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                  
                  if (generatedDescription && generatedDescription.length > 10) {
                    description = generatedDescription;
                    console.log(`[Tag Info] Successfully used Google Gemini model: ${model} for: ${tagName}`);
                    break;
                  }
                }
              }
            } catch (geminiErr: any) {
              const errorMessage = geminiErr.message || geminiErr.toString();
              console.log(`[Tag Info] Google Gemini model ${model} failed:`, errorMessage);
              
              if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
                break; // Don't try other Gemini models if quota is exceeded
              }
              continue;
            }
          }
        } catch (geminiErr: any) {
          console.log(`[Tag Info] Google Gemini API failed:`, geminiErr.message);
        }
      }
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Failed to generate tag description. Hugging Face and Google Gemini APIs are unavailable. Please check your API keys and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { description },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Tag Info] Error:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Failed to generate tag description",
      },
      { status: 500 }
    );
  }
};
