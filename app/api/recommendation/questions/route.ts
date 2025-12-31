import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Question IDs are required" }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    if (ids.length > 100) {
      return NextResponse.json({ error: "Maximum 100 question IDs allowed per request" }, { status: 400 });
    }

    await connectToDatabase();

    // Filter and validate ObjectIds
    const validObjectIds = ids
      .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id: string) => {
        try {
          if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((id: mongoose.Types.ObjectId | null): id is mongoose.Types.ObjectId => id !== null);

    if (validObjectIds.length === 0) {
      return NextResponse.json({ questions: [] }, { status: 200 });
    }

    const questions = await Question.find({
      _id: { $in: validObjectIds }
    })
      .select('_id title content tags views upvotes answers createdAt')
      .populate({ path: 'tags', model: Tag, select: '_id name' })
      .lean();

    // Type-safe formatting - handle Mongoose lean() return type
    const formattedQuestions = Array.isArray(questions) 
      ? questions
          .map((q: any) => {
            if (!q || q._id === null || q._id === undefined) return null;
            
            // Handle _id conversion - can be ObjectId, string, or object with toString
            let id: string;
            if (typeof q._id === 'string') {
              id = q._id;
            } else if (q._id && typeof q._id.toString === 'function') {
              id = q._id.toString();
            } else if (q._id && typeof q._id === 'object' && '_id' in q._id) {
              // Handle nested _id structure
              id = String(q._id);
            } else {
              id = String(q._id);
            }
            
            if (!id || id === 'null' || id === 'undefined') return null;
            
            return {
              _id: id,
              title: typeof q.title === 'string' ? q.title : null,
              content: typeof q.content === 'string' ? q.content : null,
              tags: Array.isArray(q.tags) 
                ? q.tags.map((tag: any) => ({
                    _id: typeof tag._id === 'string' ? tag._id : (tag._id?.toString?.() || String(tag._id || '')),
                    name: typeof tag.name === 'string' ? tag.name : ''
                  }))
                : [],
              views: typeof q.views === 'number' && q.views >= 0 ? q.views : 0,
              upvotes: Array.isArray(q.upvotes) ? q.upvotes.length : 0,
              answers: Array.isArray(q.answers) ? q.answers.length : 0,
              createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : (q.createdAt || null),
            };
          })
          .filter((q): q is NonNullable<typeof q> => q !== null)
      : [];

    return NextResponse.json({ questions: formattedQuestions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching question details:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch question details";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

