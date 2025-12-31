import { NextResponse } from "next/server";
import { CloudClient } from "chromadb";
import { HfInference } from "@huggingface/inference";
import { connectToDatabase } from "@/lib/mongoose";
import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import RecommendationHistory from "@/database/recommendationHistory.model";
import { auth } from "@clerk/nextjs/server";
import mongoose from "mongoose";

function getClient() {
  const apiKey = process.env.CHROMA_API_KEY;
  const tenant = process.env.CHROMA_TENANT_ID;
  const database = process.env.CHROMA_DATABASE;

  if (!apiKey || !tenant || !database) {
    throw new Error("Missing Chroma Cloud configuration. Please set CHROMA_API_KEY, CHROMA_TENANT_ID, and CHROMA_DATABASE.");
  }

  return new CloudClient({
    apiKey,
    tenant,
    database,
  });
}

async function embedQuery(text: string) {
  const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
  const model =
    process.env.HUGGINGFACE_EMBED_MODEL ||
    process.env.HF_EMBED_MODEL ||
    "sentence-transformers/all-MiniLM-L6-v2";

  if (!hfToken) {
    throw new Error(
      "Missing Hugging Face API key. Set HUGGINGFACE_API_KEY (or HF_API_KEY) so we can embed queries for Chroma."
    );
  }

  const hf = new HfInference(hfToken);
  const result = await hf.featureExtraction({
    model,
    inputs: text,
  });

  // featureExtraction may return number[] or number[][]
  const vector = Array.isArray(result[0])
    ? (result[0] as number[])
    : (result as number[]);

  if (!vector || vector.length === 0) {
    throw new Error("Failed to generate embedding for query.");
  }

  return vector;
}

export async function POST(req: Request) {
  try {
    // Get clerkId early to ensure auth context is available
    const { userId: clerkId } = await auth();
    
    const body = await req.json();
    const query = (body?.query as string | undefined)?.trim();
    const topK = Number(body?.topK ?? 5);
    const collectionName = process.env.CHROMA_COLLECTION || "questions";

    // Validate query
    if (!query || query.length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    if (query.length > 1000) {
      return NextResponse.json({ error: "Query is too long. Maximum length is 1000 characters." }, { status: 400 });
    }
    
    // Validate topK
    if (isNaN(topK) || topK < 1 || topK > 20) {
      return NextResponse.json({ error: "topK must be a number between 1 and 20" }, { status: 400 });
    }

    const client = getClient();

    let collection;
    try {
      collection = await client.getCollection({
        name: collectionName,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      const notFound =
        (err as any)?.name === "ChromaNotFoundError" ||
        message.includes("not found");

      if (notFound) {
        return NextResponse.json(
          {
            error: `Chroma collection "${collectionName}" was not found. Verify CHROMA_COLLECTION (default "questions") and that the collection exists in your "${process.env.CHROMA_DATABASE}" database/tenant.`,
          },
          { status: 404 }
        );
      }

      throw err;
    }

    const embedding = await embedQuery(query);

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: Math.min(Math.max(topK, 1), 20), // clamp 1-20
    });

    // ChromaDB returns nested arrays: results.ids is string[][], results.ids[0] is string[]
    const rawIds = Array.isArray(results.ids) && Array.isArray(results.ids[0]) ? results.ids[0] : [];
    const ids: string[] = rawIds.filter((id): id is string => id !== null && id !== undefined && typeof id === 'string');
    
    const rawDocuments = Array.isArray(results.documents) && Array.isArray(results.documents[0]) ? results.documents[0] : [];
    const documents: string[] = rawDocuments.filter((doc): doc is string => doc !== null && doc !== undefined && typeof doc === 'string');
    
    const metadatas: any[] = Array.isArray(results.metadatas) && Array.isArray(results.metadatas[0]) ? results.metadatas[0] : [];
    
    const rawDistances = Array.isArray(results.distances) && Array.isArray(results.distances[0]) ? results.distances[0] : [];
    const distances: number[] = rawDistances.filter((dist): dist is number => dist !== null && dist !== undefined && typeof dist === 'number');

    console.log(`ChromaDB returned ${ids.length} results for query: "${query}"`);

    // Fetch question titles from MongoDB
    let questionTitles: Record<string, { 
      title: string; 
      content?: string;
      tags?: Array<{ _id: string; name: string }>;
      views?: number;
      upvotes?: number;
      answers?: number;
      createdAt?: Date;
    }> = {};
    if (ids.length > 0) {
      try {
        // Ensure MongoDB connection is stable
        await connectToDatabase();
        
        // Convert string IDs to ObjectIds, filtering out invalid ones
        const validObjectIds = ids
          .map((id: string) => {
            try {
              // Check if it's already a valid ObjectId format
              if (mongoose.Types.ObjectId.isValid(id)) {
                return new mongoose.Types.ObjectId(id);
              }
              return null;
            } catch {
              return null;
            }
          })
          .filter((id: mongoose.Types.ObjectId | null): id is mongoose.Types.ObjectId => id !== null);

        if (validObjectIds.length > 0) {
          const questions = await Question.find({
            _id: { $in: validObjectIds }
          })
          .select('_id title content tags views upvotes answers createdAt')
          .populate({ path: 'tags', model: Tag, select: '_id name' })
          .lean();

          questions.forEach((q: any) => {
            if (!q || !q._id) return;
            const idStr = q._id.toString();
            questionTitles[idStr] = {
              title: q.title || null,
              content: q.content || null,
              tags: Array.isArray(q.tags) ? q.tags : [],
              views: typeof q.views === 'number' ? q.views : 0,
              upvotes: Array.isArray(q.upvotes) ? q.upvotes.length : 0,
              answers: Array.isArray(q.answers) ? q.answers.length : 0,
              createdAt: q.createdAt || null,
            };
          });

          console.log(`Fetched ${questions.length} questions from MongoDB out of ${ids.length} IDs`);
        } else {
          console.warn(`No valid ObjectIds found in ChromaDB results. IDs: ${ids.join(', ')}`);
        }
      } catch (err) {
        console.error("Failed to fetch question titles from MongoDB:", err);
        // Continue without titles - will use fallbacks in UI
      }
    }

    // Enrich metadatas with titles and additional data from MongoDB
    const enrichedMetadatas = ids.map((id: string, idx: number) => {
      if (!id || typeof id !== 'string') {
        return {
          title: null,
          content: null,
          tags: [],
          views: 0,
          upvotes: 0,
          answers: 0,
          createdAt: null,
        };
      }
      const questionData = questionTitles[id];
      const existingMeta = (idx < metadatas.length && metadatas[idx] && typeof metadatas[idx] === 'object' && !Array.isArray(metadatas[idx])) 
        ? metadatas[idx] as Record<string, any>
        : {};
      return {
        ...existingMeta,
        title: questionData?.title || existingMeta?.title || null,
        content: questionData?.content || existingMeta?.content || null,
        tags: Array.isArray(questionData?.tags) ? questionData.tags : (Array.isArray(existingMeta?.tags) ? existingMeta.tags : []),
        views: questionData?.views ?? existingMeta?.views ?? 0,
        upvotes: questionData?.upvotes ?? existingMeta?.upvotes ?? 0,
        answers: questionData?.answers ?? existingMeta?.answers ?? 0,
        createdAt: questionData?.createdAt || existingMeta?.createdAt || null,
      };
    });

    const response = {
      ids,
      documents,
      metadatas: enrichedMetadatas,
      distances,
    };

    // Save history asynchronously (non-blocking)
    // Use the clerkId we got earlier to avoid auth context issues
    if (clerkId && query && Array.isArray(ids) && ids.length > 0) {
      // Ensure database is connected (it should be from earlier, but ensure it)
      try {
        await connectToDatabase();
        
        // Prepare history data with validation
        const historyData = {
          clerkId,
          query: query.trim().substring(0, 1000), // Limit query length to prevent DB issues
          topK: Math.min(Math.max(topK, 1), 20),
          resultIds: ids
            .filter((id): id is string => id !== null && id !== undefined && typeof id === 'string')
            .slice(0, 100), // Limit to prevent excessive data
          distances: Array.isArray(distances) 
            ? distances
                .filter((d): d is number => d !== null && d !== undefined && typeof d === 'number' && !isNaN(d))
                .slice(0, 100) // Match resultIds length
            : undefined,
        };
        
        // Only save if we have at least a query and valid structure
        if (historyData.query && historyData.query.length > 0 && Array.isArray(historyData.resultIds) && historyData.resultIds.length > 0) {
          // Save history in background without blocking the response
          // Add timeout to prevent hanging promises
          const savePromise = RecommendationHistory.create(historyData);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('History save timeout')), 5000)
          );
          
          Promise.race([savePromise, timeoutPromise])
            .then((savedHistory: any) => {
              console.log(`✅ Successfully saved recommendation history for clerkId: ${clerkId}, historyId: ${savedHistory?._id}, query: "${historyData.query.substring(0, 50)}", results: ${historyData.resultIds.length}`);
            })
            .catch((err) => {
              // Log error but don't fail the request
              console.error("❌ Failed to save recommendation history:", err);
              console.error("Error details:", {
                clerkId,
                query: historyData.query.substring(0, 50),
                resultIdsCount: historyData.resultIds.length,
                topK: historyData.topK,
                errorMessage: err instanceof Error ? err.message : String(err),
                errorStack: err instanceof Error ? err.stack : undefined,
              });
            });
        } else {
          console.warn("Skipping history save - invalid data structure:", {
            hasQuery: !!historyData.query,
            queryLength: historyData.query?.length || 0,
            resultIdsIsArray: Array.isArray(historyData.resultIds),
            resultIdsLength: historyData.resultIds?.length || 0,
          });
        }
      } catch (dbErr) {
        // Log but don't fail the request
        console.error("Database connection error when saving history:", dbErr);
      }
    } else {
      if (!clerkId) {
        console.warn("No clerkId found, skipping history save. User may not be authenticated.");
      } else if (!query) {
        console.warn("No query provided, skipping history save.");
      } else if (!Array.isArray(ids)) {
        console.warn("Invalid ids format, skipping history save. Expected array, got:", typeof ids);
      } else if (ids.length === 0) {
        console.warn("Empty ids array, skipping history save.");
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error querying Chroma Cloud:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

