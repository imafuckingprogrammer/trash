-- Conservative fix for the specific ambiguous column reference issue
-- This only fixes the problematic function without creating duplicate triggers

-- First, let's see what functions currently exist
SELECT 
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%update_book%'
ORDER BY p.proname;

-- Drop only the problematic function that's causing the error
DROP FUNCTION IF EXISTS public.update_book_rating(UUID) CASCADE;

-- Recreate it with proper variable scoping
CREATE OR REPLACE FUNCTION public.update_book_rating(target_book_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.books 
  SET 
    average_rating = COALESCE((
      SELECT AVG(r.rating) 
      FROM public.reviews r 
      WHERE r.book_id = target_book_id
    ), 0),
    total_ratings = (
      SELECT COUNT(*) 
      FROM public.reviews r 
      WHERE r.book_id = target_book_id
    )
  WHERE books.id = target_book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only recreate the trigger function if it exists and is problematic
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_update_book_rating') THEN
    DROP FUNCTION public.trigger_update_book_rating() CASCADE;
    
    CREATE OR REPLACE FUNCTION public.trigger_update_book_rating()
    RETURNS TRIGGER AS $$
    DECLARE
        target_book_id UUID;
    BEGIN
      IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        target_book_id := NEW.book_id;
      ELSIF (TG_OP = 'DELETE') THEN
        target_book_id := OLD.book_id;
      END IF;

      PERFORM public.update_book_rating(target_book_id);
      
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Recreate the trigger if it was dropped
    CREATE OR REPLACE TRIGGER trigger_update_book_rating_on_reviews
      AFTER INSERT OR UPDATE OR DELETE ON public.reviews
      FOR EACH ROW EXECUTE FUNCTION public.trigger_update_book_rating();
  END IF;
END $$;

-- Verify the fix
SELECT 
  'Fixed functions:' as status,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('update_book_rating', 'trigger_update_book_rating')
ORDER BY p.proname; 