import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Question IDs are required" }, { status: 400 });
    }

    await connectToDatabase();

    const validObjectIds = ids
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
      return NextResponse.json({ questions: [] });
    }

    const questions = await Question.find({
      _id: { $in: validObjectIds }
    })
      .select('_id title content tags views upvotes answers createdAt')
      .populate({ path: 'tags', model: Tag, select: '_id name' })
      .lean();

    const formattedQuestions = Array.isArray(questions) ? questions.map((q: any) => {
      if (!q || !q._id) return null;
      return {
        _id: q._id.toString(),
        title: q.title || null,
        content: q.content || null,
        tags: Array.isArray(q.tags) ? q.tags : [],
        views: typeof q.views === 'number' ? q.views : 0,
        upvotes: Array.isArray(q.upvotes) ? q.upvotes.length : 0,
        answers: Array.isArray(q.answers) ? q.answers.length : 0,
        createdAt: q.createdAt || null,
      };
    }).filter((q: any) => q !== null) : [];

    return NextResponse.json({ questions: formattedQuestions });
  } catch (error) {
    console.error("Error fetching question details:", error);
    return NextResponse.json({ error: "Failed to fetch question details" }, { status: 500 });
  }
}

