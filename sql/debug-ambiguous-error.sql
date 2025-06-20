-- Debug query to test the exact same operation that's failing
-- This will help us identify the exact source of the ambiguous column error

-- Test 1: Simple insert without joins
INSERT INTO public.reviews (user_id, book_id, rating, review_text)
VALUES (
  'ed1b58b7-7d02-49ad-9d58-665f1995bf25', -- Replace with your user ID
  'a72fe4e7-5ba6-493a-85d4-aebbd69b22f6', -- Replace with test book ID
  5,
  'Test review from debug'
) ON CONFLICT (user_id, book_id) 
DO UPDATE SET 
  rating = EXCLUDED.rating,
  review_text = EXCLUDED.review_text,
  updated_at = timezone('utc'::text, now());

-- Test 2: Select with joins (this might be where the ambiguity occurs)
SELECT 
  r.*,
  u.id as user_id_alias,
  u.username,
  u.name,
  u.avatar_url,
  b.id as book_id_alias,
  b.title,
  b.authors
FROM public.reviews r
JOIN public.user_profiles u ON r.user_id = u.id
JOIN public.books b ON r.book_id = b.id
WHERE r.user_id = 'ed1b58b7-7d02-49ad-9d58-665f1995bf25'
  AND r.book_id = 'a72fe4e7-5ba6-493a-85d4-aebbd69b22f6';

-- Test 3: Check if RLS policies are causing issues
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('reviews', 'books', 'user_profiles')
ORDER BY tablename, policyname;

-- Test 4: Check current user context
SELECT 
  current_user,
  session_user,
  current_setting('request.jwt.claims', true) as jwt_claims;

-- Test 5: Test the exact upsert that Supabase is trying to do
WITH upsert_result AS (
  INSERT INTO public.reviews (user_id, book_id, rating, review_text)
  VALUES (
    'ed1b58b7-7d02-49ad-9d58-665f1995bf25',
    'a72fe4e7-5ba6-493a-85d4-aebbd69b22f6',
    5,
    'Test review from debug upsert'
  ) ON CONFLICT (user_id, book_id) 
  DO UPDATE SET 
    rating = EXCLUDED.rating,
    review_text = EXCLUDED.review_text,
    updated_at = timezone('utc'::text, now())
  RETURNING *
)
SELECT 
  ur.*,
  up.username,
  up.name,
  up.avatar_url,
  b.title,
  b.authors
FROM upsert_result ur
JOIN public.user_profiles up ON ur.user_id = up.id
JOIN public.books b ON ur.book_id = b.id; 