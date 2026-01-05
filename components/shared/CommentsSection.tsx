"use client"

import { useState } from "react";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm";
import { Button } from "../ui/button";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

interface CommentsSectionProps {
  answerId: string;
  currentUserId?: string;
}

const CommentsSection = ({ answerId, currentUserId }: CommentsSectionProps) => {
  const [showComments, setShowComments] = useState(false);

  // Fetch comments count (always fetch to show count even when collapsed)
  const { data: commentsData, error, isLoading, mutate } = useSWR(
    `/api/comments?answerId=${answerId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const comments = commentsData?.comments || [];
  const commentCount = comments.length;

  const handleCommentAdded = () => {
    mutate(); // Refresh comments
  };

  const handleCommentDeleted = (commentId: string) => {
    mutate(); // Refresh comments
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="text-sm text-light400_light500 hover:text-primary-500"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}` : "Add comment"}
          {showComments ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>

      {showComments && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="py-4 text-center text-sm text-light400_light500">
              Loading comments...
            </div>
          ) : error ? (
            <div className="py-4 text-center text-sm text-red-500">
              Failed to load comments
            </div>
          ) : comments.length === 0 ? (
            <div className="py-4 text-center text-sm text-light400_light500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="bg-light-900 dark:bg-dark-400 rounded-md p-3">
              {comments.map((comment: any) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onDelete={handleCommentDeleted}
                  currentUserId={currentUserId}
                  userId={currentUserId}
                />
              ))}
            </div>
          )}

          <CommentForm answerId={answerId} onCommentAdded={handleCommentAdded} />
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
