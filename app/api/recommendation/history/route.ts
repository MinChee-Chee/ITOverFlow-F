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
      .lean();

    return NextResponse.json(
      Array.isArray(history) ? history.map((h: any) => {
        if (!h) return null;
        return {
          id: h._id?.toString?.() || "",
          query: h.query || "",
          topK: typeof h.topK === 'number' ? h.topK : 5,
          resultIds: Array.isArray(h.resultIds) ? h.resultIds : [],
          distances: Array.isArray(h.distances) ? h.distances : undefined,
          createdAt: h.createdAt || new Date(),
        };
      }).filter((h: any) => h !== null) : []
    );
  } catch (error) {
    console.error("Error fetching recommendation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendation history" },
      { status: 500 }
    );
  }
}

