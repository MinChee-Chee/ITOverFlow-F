import { NextRequest, NextResponse } from "next/server";
import { deleteComment } from "@/lib/actions/comment.action";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/lib/actions/user.action";
import Comment from "@/database/comment.model";
import { connectToDatabase } from "@/lib/mongoose";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const commentId = params.id;

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const comment = await Comment.findById(commentId).populate("author", "clerkId");

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    const mongoUser = await getUserById({ userId });

    if (!mongoUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is the author of the comment
    if (comment.author._id.toString() !== mongoUser._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own comments" },
        { status: 403 }
      );
    }

    const path = request.headers.get("referer") || "/";

    await deleteComment({
      commentId,
      path,
    });

    return NextResponse.json(
      { message: "Comment deleted successfully" },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: unknown) {
    console.error("Error deleting comment:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete comment";
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
