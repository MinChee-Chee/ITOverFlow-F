import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongoose";
import ChatAIHistory from "@/database/chatAIHistory.model";

import { Pinecone } from '@pinecone-database/pinecone';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Sign in to chat with the AI assistant." },
        { status: 401 }
      );
    }

    const { messages, model = 'gpt-4o' } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Get Pinecone credentials from environment
    const assistantId = process.env.PINECONE_ASSISTANT_ID;
    const apiKey = process.env.PINECONE_API_KEY;

    if (!assistantId || !apiKey) {
      return NextResponse.json(
        { error: "Pinecone assistant configuration is missing" },
        { status: 500 }
      );
    }

    // Initialize Pinecone client
    const pc = new Pinecone({ apiKey: apiKey });
    const assistant = pc.assistant(assistantId);
    
    // Call Pinecone assistant chat
    const chatResp = await assistant.chat({
      messages: messages,
      model: model,
    });

    // Save chat history to database
    await connectToDatabase();

    // Prepare history data with the full conversation
    // Pinecone ChatModel uses camelCase: { id, model, usage, message: { content, role }, finishReason, citations }
    // Type assertion needed as TypeScript types may not match runtime structure
    const chatRespAny = chatResp as any;
    const assistantContent = chatRespAny.message?.content || chatRespAny.content || '';
    const assistantCitations = chatResp.citations || [];
    
    const historyData = {
      clerkId,
      messages: [
        ...messages,
        {
          role: 'assistant' as const,
          content: assistantContent,
          citations: assistantCitations,
        },
      ],
      aiModel: chatResp.model || model,
      usage: chatResp.usage || undefined,
    };

    await ChatAIHistory.create(historyData);

    // Return response in the format expected by the frontend
    // Convert camelCase to snake_case for API consistency
    return NextResponse.json({
      id: chatResp.id || `chat_${Date.now()}`,
      model: chatResp.model || model,
      usage: chatResp.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
      message: {
        content: assistantContent,
        role: 'assistant',
      },
      finish_reason: chatResp.finishReason || 'stop',
      citations: assistantCitations,
    }, { status: 200 });
  } catch (error) {
    console.error("Error in chat AI API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process chat request";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
