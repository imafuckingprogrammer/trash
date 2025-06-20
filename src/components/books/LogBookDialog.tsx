"use client";

import { useState, useEffect } from 'react';
import type { Book, Review, UserBookInteraction } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/StarRating';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LogBookDialogProps {
  book: Book;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogSaved: (logDetails: {
    rating?: number;
    isRead?: boolean;
    isCurrentlyReading?: boolean;
    readDate?: string; // ISO string
    reviewText?: string;
  }) => Promise<void>; // Make it async
  existingReview?: Review | null;
  initialInteraction: Partial<UserBookInteraction>; // Pass current interaction state
}

export function LogBookDialog({ book, isOpen, onOpenChange, onLogSaved, existingReview, initialInteraction }: LogBookDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState<number | undefined>(initialInteraction.rating ?? existingReview?.rating);
  const [isRead, setIsRead] = useState<boolean>(initialInteraction.is_read ?? !!existingReview);
  const [isCurrentlyReading, setIsCurrentlyReading] = useState<boolean>(initialInteraction.is_currently_reading ?? false);
  const [readDate, setReadDate] = useState<Date | undefined>(
    initialInteraction.read_date ? new Date(initialInteraction.read_date) : (existingReview?.created_at ? new Date(existingReview.created_at) : undefined)
  );
  const [reviewText, setReviewText] = useState<string>(existingReview?.review_text || '');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    // Reset form when dialog opens or relevant props change
    setRating(initialInteraction.rating ?? existingReview?.rating);
    setIsRead(initialInteraction.is_read ?? !!existingReview); // A review implies it's read
    setIsCurrentlyReading(initialInteraction.is_currently_reading ?? false);
    setReadDate(initialInteraction.read_date ? new Date(initialInteraction.read_date) : (existingReview?.created_at ? new Date(existingReview.created_at) : undefined));
    setReviewText(existingReview?.review_text || '');
  }, [isOpen, book, existingReview, initialInteraction]);

  const handleSave = async () => {
    if (isRead && !readDate) {
      toast({ title: "Date Required", description: "Please select a date for when you read the book.", variant: "destructive" });
      return;
    }
    if (isRead && !rating) { // Rating is required if marked as read
        toast({ title: "Rating Required", description: "Please provide a rating if you've read the book.", variant: "destructive" });
        return;
    }
    // If not read, but rating or review text exists, it implies they are logging current thoughts, not a "read" entry
    // However, our current logic ties reviews to "read" status. This might need refinement.
    // For now, if not isRead, we clear rating and reviewText for the log.
    // The parent component (BookDetailsPage) will handle what to do with existing reviews if isRead is unchecked.
    
    setIsSaving(true);
    try {
        await onLogSaved({
            rating: isRead ? rating : undefined, // Only save rating if read
            isRead: isRead,
            isCurrentlyReading: isCurrentlyReading,
            readDate: isRead && readDate ? readDate.toISOString() : undefined,
            reviewText: isRead ? reviewText : '', // Only save review text if read
        });
        // Toast is handled by the caller (BookDetailsPage) after successful API calls
        onOpenChange(false);
    } catch (error) {
        console.error("Error in onLogSaved:", error);
        toast({ title: "Save Error", description: "Could not save your log. Please try again.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Log & Review: {book.title}</DialogTitle>
          <DialogDescription>
            {existingReview ? "Edit your log and review." : "Rate this book, mark it as read, and optionally write a review."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="rating">Your Rating</Label>
            <StarRating 
              count={5} 
              initialRating={rating} 
              onRatingChange={setRating} 
              size={28} 
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isCurrentlyReading" 
                checked={isCurrentlyReading} 
                onCheckedChange={(checked) => {
                  const newIsCurrentlyReading = Boolean(checked);
                  setIsCurrentlyReading(newIsCurrentlyReading);
                  if (newIsCurrentlyReading) {
                    setIsRead(false); // Can't be both currently reading and read
                    setReadDate(undefined);
                  }
                }}
              />
              <Label htmlFor="isCurrentlyReading" className="font-medium">I am currently reading this book</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isRead" 
                checked={isRead} 
                onCheckedChange={(checked) => {
                  const newIsRead = Boolean(checked);
                  setIsRead(newIsRead);
                  if (newIsRead) {
                    setIsCurrentlyReading(false); // Can't be both read and currently reading
                    if (!readDate) {
                      setReadDate(new Date()); // Default to today if marking as read and no date
                    }
                  }
                }}
              />
              <Label htmlFor="isRead" className="font-medium">I have read this book</Label>
            </div>
          </div>

          {isRead && (
            <div className="space-y-2">
              <Label htmlFor="readDate">Date Read</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !readDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {readDate ? format(readDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={readDate}
                    onSelect={setReadDate}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reviewText">{isRead ? "Your Review" : "Notes (private)"}</Label>
            <Textarea 
              id="reviewText"
              placeholder={isRead ? `What did you think of "${book.title}"?` : "Add some private notes..."}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="min-h-[120px]"
            />
             <p className="text-xs text-muted-foreground">
                {isRead ? "This will be published as your review if you provide text and a rating." : "Notes are private to your log."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
          <Button type="button" onClick={handleSave} className="transition-transform hover:scale-105" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
