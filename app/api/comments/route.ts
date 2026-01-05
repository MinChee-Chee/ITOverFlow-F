import { NextRequest, NextResponse } from "next/server";
import { getComments, createComment } from "@/lib/actions/comment.action";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.action";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(1000, "Comment is too long"),
  answerId: z.string().min(1, "Answer ID is required"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const answerId = searchParams.get("answerId");

    if (!answerId) {
      return NextResponse.json(
        { error: "Answer ID is required" },
        { status: 400 }
      );
    }

    const result = await getComments({ answerId });

    if (!result || !result.comments) {
      return NextResponse.json(
        { error: "Failed to fetch comments", comments: [] },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { comments: result.comments },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching comments:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json(
      {
        error: message,
        comments: [],
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { content, answerId } = validation.data;

    const mongoUser = await getUserById({ userId });

    if (!mongoUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const path = request.headers.get("referer") || "/";

    const comment = await createComment({
      content,
      author: mongoUser._id.toString(),
      answerId,
      path,
    });

    return NextResponse.json(
      { comment },
      { 
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: unknown) {
    console.error("Error creating comment:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
