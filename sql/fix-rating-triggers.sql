-- Fix rating update triggers to ensure global book ratings are updated properly

-- First, let's check if we have the correct trigger functions
-- Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS trigger_reviews_update_book_rating ON public.reviews;
DROP FUNCTION IF EXISTS public.trigger_update_book_rating() CASCADE;
DROP FUNCTION IF EXISTS public.update_book_rating(UUID) CASCADE;

-- Create the main rating update function
CREATE OR REPLACE FUNCTION public.update_book_rating(target_book_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    new_avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    -- Calculate new average rating and count
    SELECT 
        ROUND(AVG(rating)::numeric, 2)::DECIMAL(3,2),
        COUNT(*)::INTEGER
    INTO new_avg_rating, review_count
    FROM public.reviews 
    WHERE book_id = target_book_id;
    
    -- Update the book with new rating
    UPDATE public.books 
    SET 
        average_rating = COALESCE(new_avg_rating, 0),
        review_count = COALESCE(review_count, 0),
        updated_at = NOW()
    WHERE id = target_book_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated book % rating to % with % reviews', target_book_id, new_avg_rating, review_count;
END;
$$;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_update_book_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_book_id UUID;
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        target_book_id := NEW.book_id;
        PERFORM public.update_book_rating(target_book_id);
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        target_book_id := OLD.book_id;
        PERFORM public.update_book_rating(target_book_id);
    END IF;
    
    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_reviews_update_book_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_book_rating();

-- Now let's recalculate all existing book ratings
DO $$
DECLARE
    book_record RECORD;
BEGIN
    FOR book_record IN 
        SELECT DISTINCT id FROM public.books 
        WHERE id IN (SELECT DISTINCT book_id FROM public.reviews)
    LOOP
        PERFORM public.update_book_rating(book_record.id);
    END LOOP;
    
    RAISE NOTICE 'Recalculated ratings for all books with reviews';
END;
$$;

-- Verify the function exists
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('update_book_rating', 'trigger_update_book_rating');

-- Verify the trigger exists
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'reviews'
AND t.tgname = 'trigger_reviews_update_book_rating'; 