// src/components/ui/StarRating.tsx
"use client";

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  count?: number;
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  color?: string;
  readonly?: boolean;
  className?: string;
}

export function StarRating({
  count = 5,
  initialRating = 0,
  onRatingChange,
  size = 20,
  color = "hsl(var(--accent))", // Use accent color by default
  readonly = false,
  className,
}: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (newRating: number) => {
    if (readonly) return;
    setRating(newRating);
    if (onRatingChange) {
      onRatingChange(newRating);
    }
  };

  const handleMouseEnter = (newHoverRating: number) => {
    if (readonly) return;
    setHoverRating(newHoverRating);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {[...Array(count)].map((_, index) => {
        const starValue = index + 1;
        const isActive = starValue <= (hoverRating || rating);
        return (
          <Star
            key={starValue}
            size={size}
            fill={isActive ? color : 'none'}
            stroke={color}
            className={cn(
              "cursor-pointer transition-colors duration-150",
              readonly && "cursor-default"
            )}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}
