import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongoose";
import ChatAIHistory from "@/database/chatAIHistory.model";

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Sign in to view your chat history." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || "50");
    const limit = Math.min(Math.max(limitParam, 1), 100); // clamp 1-100

    const history = await ChatAIHistory.find({ clerkId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id messages aiModel usage createdAt updatedAt")
      .lean();

    // Type-safe mapping
    const mappedHistory = Array.isArray(history)
      ? history
          .map((h: any) => {
            if (!h || h._id === null || h._id === undefined) return null;

            // Handle _id conversion
            let id: string;
            if (typeof h._id === "string") {
              id = h._id;
            } else if (h._id && typeof h._id.toString === "function") {
              id = h._id.toString();
            } else {
              id = String(h._id);
            }

            if (!id || id === "null" || id === "undefined") return null;

            return {
              id,
              messages: Array.isArray(h.messages) ? h.messages : [],
              model: typeof h.aiModel === "string" ? h.aiModel : undefined,
              usage: h.usage || undefined,
              createdAt: h.createdAt
                ? h.createdAt instanceof Date
                  ? h.createdAt.toISOString()
                  : String(h.createdAt)
                : new Date().toISOString(),
              updatedAt: h.updatedAt
                ? h.updatedAt instanceof Date
                  ? h.updatedAt.toISOString()
                  : String(h.updatedAt)
                : new Date().toISOString(),
            };
          })
          .filter((h): h is NonNullable<typeof h> => h !== null)
      : [];

    return NextResponse.json(mappedHistory, { status: 200 });
  } catch (error) {
    console.error("Error fetching chat AI history:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch chat history";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
