-- Comprehensive fix for all ambiguous column references
-- This resolves all "column reference is ambiguous" errors

-- 1. Fix the update_book_ratings function
DROP FUNCTION IF EXISTS public.update_book_ratings() CASCADE;

CREATE OR REPLACE FUNCTION public.update_book_ratings()
RETURNS TRIGGER AS $$
DECLARE
    target_book_id UUID;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    target_book_id := NEW.book_id;
  ELSIF (TG_OP = 'DELETE') THEN
    target_book_id := OLD.book_id;
  END IF;

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

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER after_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_book_ratings();

-- 2. Fix the update_list_item_count function (in case it also has issues)
DROP FUNCTION IF EXISTS public.update_list_item_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_list_item_count()
RETURNS TRIGGER AS $$
DECLARE
    target_list_id UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    target_list_id := NEW.list_collection_id;
    UPDATE public.list_collections
    SET item_count = item_count + 1
    WHERE list_collections.id = target_list_id;
  ELSIF (TG_OP = 'DELETE') THEN
    target_list_id := OLD.list_collection_id;
    UPDATE public.list_collections
    SET item_count = item_count - 1
    WHERE list_collections.id = target_list_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER after_list_item_change
  AFTER INSERT OR DELETE ON public.list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_list_item_count();

-- 3. Fix the update_parent_comment_count function
DROP FUNCTION IF EXISTS public.update_parent_comment_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_parent_comment_count()
RETURNS TRIGGER AS $$
DECLARE
    target_review_id UUID;
    target_list_id UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    target_review_id := NEW.review_id;
    target_list_id := NEW.list_collection_id;
    
    IF target_review_id IS NOT NULL THEN
      UPDATE public.reviews 
      SET comment_count = comment_count + 1 
      WHERE reviews.id = target_review_id;
    ELSIF target_list_id IS NOT NULL THEN
      UPDATE public.list_collections 
      SET comment_count = comment_count + 1 
      WHERE list_collections.id = target_list_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    target_review_id := OLD.review_id;
    target_list_id := OLD.list_collection_id;
    
    IF target_review_id IS NOT NULL THEN
      UPDATE public.reviews 
      SET comment_count = comment_count - 1 
      WHERE reviews.id = target_review_id;
    ELSIF target_list_id IS NOT NULL THEN
      UPDATE public.list_collections 
      SET comment_count = comment_count - 1 
      WHERE list_collections.id = target_list_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER after_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_parent_comment_count();

-- 4. Fix the update_parent_like_count function
DROP FUNCTION IF EXISTS public.update_parent_like_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_parent_like_count()
RETURNS TRIGGER AS $$
DECLARE
    target_review_id UUID;
    target_list_id UUID;
    target_comment_id UUID;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    target_review_id := NEW.review_id;
    target_list_id := NEW.list_collection_id;
    target_comment_id := NEW.comment_id;
    
    IF target_review_id IS NOT NULL THEN
      UPDATE public.reviews 
      SET like_count = like_count + 1 
      WHERE reviews.id = target_review_id;
    ELSIF target_list_id IS NOT NULL THEN
      UPDATE public.list_collections 
      SET like_count = like_count + 1 
      WHERE list_collections.id = target_list_id;
    ELSIF target_comment_id IS NOT NULL THEN
      UPDATE public.comments 
      SET like_count = like_count + 1 
      WHERE comments.id = target_comment_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    target_review_id := OLD.review_id;
    target_list_id := OLD.list_collection_id;
    target_comment_id := OLD.comment_id;
    
    IF target_review_id IS NOT NULL THEN
      UPDATE public.reviews 
      SET like_count = like_count - 1 
      WHERE reviews.id = target_review_id;
    ELSIF target_list_id IS NOT NULL THEN
      UPDATE public.list_collections 
      SET like_count = like_count - 1 
      WHERE list_collections.id = target_list_id;
    ELSIF target_comment_id IS NOT NULL THEN
      UPDATE public.comments 
      SET like_count = like_count - 1 
      WHERE comments.id = target_comment_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER after_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_parent_like_count();

-- Verify all functions are created
SELECT 
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('update_book_ratings', 'update_list_item_count', 'update_parent_comment_count', 'update_parent_like_count')
ORDER BY p.proname; 