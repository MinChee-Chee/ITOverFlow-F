import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongoose";
import RecommendationHistory from "@/database/recommendationHistory.model";

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Sign in to view your recommendation history." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || "100");
    const limit = Math.min(Math.max(limitParam, 1), 500); // clamp 1-500 to avoid runaway

    const history = await RecommendationHistory.find({ clerkId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id query topK resultIds distances createdAt') // Only select needed fields
      .lean();

    console.log(`Found ${history.length} history records for clerkId: ${clerkId}`);

    // Type-safe mapping - handle Mongoose lean() return type
    const mappedHistory = Array.isArray(history) 
      ? history
          .map((h: any) => {
            if (!h || h._id === null || h._id === undefined) return null;
            
            // Handle _id conversion - can be ObjectId, string, or object with toString
            let id: string;
            if (typeof h._id === 'string') {
              id = h._id;
            } else if (h._id && typeof h._id.toString === 'function') {
              id = h._id.toString();
            } else if (h._id && typeof h._id === 'object' && '_id' in h._id) {
              // Handle nested _id structure
              id = String(h._id);
            } else {
              id = String(h._id);
            }
            
            if (!id || id === 'null' || id === 'undefined') return null;
            
            return {
              id,
              query: typeof h.query === 'string' ? h.query : "",
              topK: typeof h.topK === 'number' && h.topK > 0 ? h.topK : 5,
              resultIds: Array.isArray(h.resultIds) ? h.resultIds.filter((id: unknown): id is string => typeof id === 'string') : [],
              distances: Array.isArray(h.distances) 
                ? h.distances.filter((d: unknown): d is number => typeof d === 'number' && !isNaN(d))
                : undefined,
              createdAt: h.createdAt 
                ? (h.createdAt instanceof Date ? h.createdAt.toISOString() : String(h.createdAt))
                : new Date().toISOString(),
            };
          })
          .filter((h): h is NonNullable<typeof h> => h !== null)
      : [];

    return NextResponse.json(mappedHistory, { status: 200 });
  } catch (error) {
    console.error("Error fetching recommendation history:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch recommendation history";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

