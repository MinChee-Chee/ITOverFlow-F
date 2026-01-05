"use client"

import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useAuth } from "@clerk/nextjs";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CommentFormProps {
  answerId: string;
  onCommentAdded: () => void;
}

const CommentForm = ({ answerId, onCommentAdded }: CommentFormProps) => {
  const { userId } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      return toast({
        title: "Please log in",
        description: "You must be logged in to add a comment",
        variant: "destructive",
      });
    }

    if (!content.trim()) {
      return toast({
        title: "Comment cannot be empty",
        variant: "destructive",
      });
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          answerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create comment");
      }

      setContent("");
      onCommentAdded();
      toast({
        title: "Comment added",
        variant: "default",
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userId) {
    return (
      <div className="mt-4 p-4 text-center text-sm text-light400_light500 border border-light-700 dark:border-dark-400 rounded-md">
        Please log in to add a comment
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
      />
      <div className="flex justify-end mt-2">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !content.trim()}
          className="mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Comment"
          )}
        </Button>
      </div>
    </form>
  );
};

export default CommentForm;
