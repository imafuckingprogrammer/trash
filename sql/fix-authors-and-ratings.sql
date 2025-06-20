-- Fix authors and ratings issues

-- 1. Fix avatar URL and cover image URL limits
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_avatar_url_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_avatar_url_check 
    CHECK (char_length(avatar_url) <= 1024);

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_cover_image_url_check;
ALTER TABLE public.books ADD CONSTRAINT books_cover_image_url_check 
    CHECK (char_length(cover_image_url) <= 1024);

-- 2. Update any existing books that might have empty authors arrays
UPDATE public.books 
SET authors = ARRAY['Unknown Author'] 
WHERE authors = '{}' OR authors IS NULL OR array_length(authors, 1) IS NULL;

-- 3. Ensure all books have proper average ratings (recalculate from reviews)
UPDATE public.books 
SET 
    average_rating = COALESCE((
        SELECT AVG(rating)::NUMERIC(3,2) 
        FROM public.reviews 
        WHERE book_id = books.id
    ), 0.00),
    total_ratings = (
        SELECT COUNT(*) 
        FROM public.reviews 
        WHERE book_id = books.id
    ),
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT book_id FROM public.reviews
    UNION
    SELECT id FROM public.books WHERE average_rating IS NULL OR total_ratings IS NULL
);

-- 4. Create or replace the book rating update trigger function
CREATE OR REPLACE FUNCTION public.update_book_rating(target_book_id UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating NUMERIC(3,2);
    total_count INTEGER;
BEGIN
    -- Calculate average rating and total count for the book
    SELECT 
        COALESCE(AVG(rating)::NUMERIC(3,2), 0.00),
        COUNT(*)::INTEGER
    INTO avg_rating, total_count
    FROM public.reviews 
    WHERE book_id = target_book_id;
    
    -- Update the book's rating information
    UPDATE public.books 
    SET 
        average_rating = avg_rating,
        total_ratings = total_count,
        updated_at = NOW()
    WHERE id = target_book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger function for automatic book rating updates
CREATE OR REPLACE FUNCTION public.trigger_update_book_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.update_book_rating(NEW.book_id);
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_book_rating(OLD.book_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for automatic book rating updates
DROP TRIGGER IF EXISTS trigger_reviews_update_book_rating ON public.reviews;
CREATE TRIGGER trigger_reviews_update_book_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_book_rating();

-- 7. Fix any books that might have invalid ratings
UPDATE public.books 
SET average_rating = 0.00 
WHERE average_rating < 0.00 OR average_rating > 5.00;

UPDATE public.books 
SET total_ratings = 0 
WHERE total_ratings < 0;

-- 8. Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_reviews_book_id_rating ON public.reviews (book_id, rating);
CREATE INDEX IF NOT EXISTS idx_books_average_rating ON public.books (average_rating DESC);

-- 9. Update any existing reviews to trigger rating recalculation
UPDATE public.books 
SET updated_at = NOW() 
WHERE id IN (SELECT DISTINCT book_id FROM public.reviews);

COMMENT ON TABLE public.books IS 'Books table - authors field fixed, ratings recalculated';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'Avatar URL - max 1024 characters';
COMMENT ON COLUMN public.books.cover_image_url IS 'Cover image URL - max 1024 characters'; 