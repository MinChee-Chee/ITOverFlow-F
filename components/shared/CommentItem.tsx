"use client"

import Image from "next/image";
import Link from "next/link";
import ClientTimestamp from "./ClientTimestamp";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/nextjs";
import ReportButton from "./ReportButton";

interface CommentItemProps {
  comment: {
    _id: string;
    content: string;
    author: {
      _id: string;
      clerkId: string;
      name: string;
      picture: string;
    };
    createdAt: Date;
  };
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  userId?: string;
}

const CommentItem = ({ comment, onDelete, currentUserId }: CommentItemProps) => {
  const { userId } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isAuthor = currentUserId && comment.author._id.toString() === currentUserId;

  const handleDelete = async () => {
    if (!userId) {
      return toast({
        title: "Please log in",
        description: "You must be logged in to delete comments",
        variant: "destructive",
      });
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/comments/${comment._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      onDelete(comment._id);
      toast({
        title: "Comment deleted",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Failed to delete comment",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-3 py-3 border-b border-light-700 dark:border-dark-400 last:border-0">
      <Link href={`/profile/${comment.author.clerkId}`} className="flex-shrink-0">
        <Image
          src={comment.author.picture}
          width={24}
          height={24}
          alt={comment.author.name}
          className="rounded-full object-cover"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/profile/${comment.author.clerkId}`}
                className="text-sm font-semibold text-dark300_light700 hover:text-primary-500"
              >
                {comment.author.name}
              </Link>
              <ClientTimestamp
                createdAt={comment.createdAt}
                className="text-xs text-light400_light500"
              />
            </div>
            <p className="text-sm text-dark200_light900 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userId && (
              <ReportButton
                type="comment"
                commentId={comment._id}
                userId={userId}
              />
            )}
            {isAuthor && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
