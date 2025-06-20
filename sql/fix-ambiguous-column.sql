-- Fix for ambiguous column reference in update_book_ratings function
-- This resolves the "column reference 'book_id' is ambiguous" error

-- Drop and recreate the function with proper table aliases
DROP FUNCTION IF EXISTS public.update_book_ratings() CASCADE;

CREATE OR REPLACE FUNCTION public.update_book_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE public.books
    SET 
      average_rating = (SELECT AVG(r.rating) FROM public.reviews r WHERE r.book_id = NEW.book_id),
      total_ratings = (SELECT COUNT(*) FROM public.reviews r WHERE r.book_id = NEW.book_id)
    WHERE id = NEW.book_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.books
    SET 
      average_rating = COALESCE((SELECT AVG(r.rating) FROM public.reviews r WHERE r.book_id = OLD.book_id), 0),
      total_ratings = (SELECT COUNT(*) FROM public.reviews r WHERE r.book_id = OLD.book_id)
    WHERE id = OLD.book_id;
  END IF;
  RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER after_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_book_ratings(); 