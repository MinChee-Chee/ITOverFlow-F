import Image from "next/image";
import Link from "next/link";
import React from "react";

import ROUTES from "@/constants/routes";
import { getDeviconClassName } from "@/lib/utils";

import { Badge } from "../ui/badge";

interface Props {
  _id: string;
  name: string;
  questions?: number;
  showCount?: boolean;
  compact?: boolean;
  remove?: boolean;
  isButton?: boolean;
  handleRemove?: () => void;
  noLink?: boolean; // Disable link when nested inside another link
}

const TagCard = ({
  _id,
  name,
  questions,
  showCount,
  compact,
  remove,
  isButton,
  handleRemove,
  noLink,
}: Props) => {
  const iconClass = getDeviconClassName(name);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const Content = (
    <>
      <Badge className="subtle-medium background-light800_dark300 text-light400_light500 flex flex-row gap-2 rounded-md border-none px-4 py-2 uppercase">
        <div className="flex-center space-x-2">
          <i className={`${iconClass} text-sm`}></i>
          <span>{name}</span>
        </div>

        {remove && (
          <Image
            src="/assets/icons/close.svg"
            width={12}
            height={12}
            alt="close icon"
            className="cursor-pointer object-contain invert-0 dark:invert"
            onClick={handleRemove}
          />
        )}
      </Badge>

      {showCount && (
        <p className="small-medium text-dark500_light700">{questions}</p>
      )}
    </>
  );

  // Default to compact mode if not specified
  const isCompact = compact !== false;

  if (isCompact) {
    if (isButton) {
      return (
        <button onClick={handleClick} className="flex justify-between gap-2">
          {Content}
        </button>
      );
    }
    
    // If noLink is true, render as div to avoid nested links
    if (noLink) {
      return (
        <div className="flex justify-between gap-2">
          {Content}
        </div>
      );
    }
    
    return (
      <Link href={ROUTES.TAGS(_id)} className="flex justify-between gap-2">
        {Content}
      </Link>
    );
  }

  // Non-compact mode (for future use)
  return (
    <div className="flex justify-between gap-2">
      {Content}
    </div>
  );
};

export default TagCard;