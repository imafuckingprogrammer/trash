-- Fix avatar URL and cover image URL limits
-- Current limit is 512 characters, increasing to 1024

-- Update user_profiles table constraint for avatar_url
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_avatar_url_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_avatar_url_check 
    CHECK (char_length(avatar_url) <= 1024);

-- Update books table constraint for cover_image_url
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_cover_image_url_check;
ALTER TABLE public.books ADD CONSTRAINT books_cover_image_url_check 
    CHECK (char_length(cover_image_url) <= 1024);

-- Update the settings page validation limit as well by updating the comment
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'Avatar URL - max 1024 characters';
COMMENT ON COLUMN public.books.cover_image_url IS 'Cover image URL - max 1024 characters'; 