
-- Enable Row Level Security (RLS) for all tables by default.
-- Policies will need to be created for each table to define access rules.
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- Users Table (Public Profile Information)
-- This table stores public profile information that is linked to the auth.users table.
CREATE TABLE public.user_profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30 AND username ~ '^[a-zA-Z0-9_]+$'),
  name TEXT CHECK (char_length(name) <= 100),
  avatar_url TEXT CHECK (char_length(avatar_url) <= 512),
  bio TEXT CHECK (char_length(bio) <= 500),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Function to create a user profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  profile_username TEXT;
BEGIN
  -- Attempt to use username from metadata, fallback to a unique ID based part if not provided or clashing
  -- Supabase Auth passes raw_user_meta_data on signup
  profile_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user' || substr(NEW.id::text, 1, 8));
  
  -- Ensure username is unique, append random chars if not. This is a simple fallback.
  -- A more robust solution might involve checking and prompting user for a unique username.
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = profile_username) LOOP
    profile_username := profile_username || substr(md5(random()::text), 1, 3);
  END LOOP;

  INSERT INTO public.user_profiles (id, username, name, avatar_url)
  VALUES (NEW.id, profile_username, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on new auth.users signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Books Table
-- Stores information about books, potentially aggregated from multiple sources.
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_book_id TEXT UNIQUE,
  open_library_id TEXT UNIQUE,
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 255),
  authors TEXT[] DEFAULT '{}', -- Array of author names
  cover_image_url TEXT CHECK (char_length(cover_image_url) <= 512),
  summary TEXT,
  publication_year INTEGER CHECK (publication_year >= 0 AND publication_year <= extract(year from now()) + 5),
  isbn13 TEXT UNIQUE CHECK (char_length(isbn13) = 13), -- Primary ISBN
  isbn10 TEXT UNIQUE CHECK (char_length(isbn10) = 10),
  genres TEXT[] DEFAULT '{}',
  page_count INTEGER CHECK (page_count >= 0),
  average_rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (average_rating >= 0.00 AND average_rating <= 5.00), -- App-wide calculated average
  total_ratings INTEGER DEFAULT 0 CHECK (total_ratings >= 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_books_title ON public.books USING GIN (to_tsvector('english', title));
CREATE INDEX idx_books_authors ON public.books USING GIN (authors);
CREATE TRIGGER on_books_updated
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- User Book Interactions Table
-- Tracks user-specific interactions with books (read, owned, watchlist, rating, like).
CREATE TABLE public.user_book_interactions (
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_date DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- User's personal rating
  is_owned BOOLEAN DEFAULT FALSE NOT NULL,
  is_on_watchlist BOOLEAN DEFAULT FALSE NOT NULL,
  is_liked BOOLEAN DEFAULT FALSE NOT NULL, -- User 'liked' the book entity itself
  log_notes TEXT CHECK (char_length(log_notes) <= 1000), -- Short diary notes
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, book_id)
);
CREATE INDEX idx_user_book_interactions_read ON public.user_book_interactions (user_id, is_read);
CREATE INDEX idx_user_book_interactions_watchlist ON public.user_book_interactions (user_id, is_on_watchlist);
CREATE TRIGGER on_user_book_interactions_updated
  BEFORE UPDATE ON public.user_book_interactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Reviews Table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Rating associated with this review
  review_text TEXT CHECK (char_length(review_text) <= 10000),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
  UNIQUE (user_id, book_id) -- A user can only have one review per book
);
CREATE INDEX idx_reviews_book_id ON public.reviews (book_id);
CREATE INDEX idx_reviews_user_id ON public.reviews (user_id);
CREATE TRIGGER on_reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();
  
-- Function to update book's average_rating and total_ratings when a review is added/updated/deleted
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

CREATE TRIGGER after_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_book_ratings();


-- List Collections Table (previously Book Lists)
CREATE TABLE public.list_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  is_public BOOLEAN DEFAULT TRUE NOT NULL,
  item_count INTEGER DEFAULT 0 CHECK (item_count >= 0),
  like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
  comment_count INTEGER DEFAULT 0 CHECK (comment_count >= 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_list_collections_user_id ON public.list_collections (user_id);
CREATE INDEX idx_list_collections_name ON public.list_collections USING GIN (to_tsvector('english', name));
CREATE TRIGGER on_list_collections_updated
  BEFORE UPDATE ON public.list_collections
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- List Items Table (Books within a List Collection)
CREATE TABLE public.list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_collection_id UUID NOT NULL REFERENCES public.list_collections(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  sort_order INTEGER DEFAULT 0, -- For user-defined ordering within a list
  UNIQUE (list_collection_id, book_id)
);
CREATE INDEX idx_list_items_list_id ON public.list_items (list_collection_id);
CREATE INDEX idx_list_items_book_id ON public.list_items (book_id);

-- Function to update list_collection item_count
CREATE OR REPLACE FUNCTION public.update_list_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.list_collections
    SET item_count = item_count + 1
    WHERE id = NEW.list_collection_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.list_collections
    SET item_count = item_count - 1
    WHERE id = OLD.list_collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_list_item_change
  AFTER INSERT OR DELETE ON public.list_items
  FOR EACH ROW EXECUTE PROCEDURE public.update_list_item_count();


-- Comments Table (For reviews and lists)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  list_collection_id UUID REFERENCES public.list_collections(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For threaded replies
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 2000),
  like_count INTEGER DEFAULT 0 CHECK (like_count >= 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT chk_comment_target CHECK (
    (review_id IS NOT NULL AND list_collection_id IS NULL) OR
    (review_id IS NULL AND list_collection_id IS NOT NULL)
  ) -- Ensures a comment belongs to either a review or a list, but not both.
);
CREATE INDEX idx_comments_review_id ON public.comments (review_id);
CREATE INDEX idx_comments_list_id ON public.comments (list_collection_id);
CREATE INDEX idx_comments_user_id ON public.comments (user_id);
CREATE INDEX idx_comments_parent_id ON public.comments (parent_comment_id);
CREATE TRIGGER on_comments_updated
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Function to update comment_count on parent entity (review or list)
CREATE OR REPLACE FUNCTION public.update_parent_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.review_id IS NOT NULL THEN
      UPDATE public.reviews SET comment_count = comment_count + 1 WHERE id = NEW.review_id;
    ELSIF NEW.list_collection_id IS NOT NULL THEN
      UPDATE public.list_collections SET comment_count = comment_count + 1 WHERE id = NEW.list_collection_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.review_id IS NOT NULL THEN
      UPDATE public.reviews SET comment_count = comment_count - 1 WHERE id = OLD.review_id;
    ELSIF OLD.list_collection_id IS NOT NULL THEN
      UPDATE public.list_collections SET comment_count = comment_count - 1 WHERE id = OLD.list_collection_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_parent_comment_count();


-- Likes Table (For reviews, lists, comments)
CREATE TABLE public.likes (
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  list_collection_id UUID REFERENCES public.list_collections(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, review_id, list_collection_id, comment_id), -- This composite PK is tricky due to NULLs
  CONSTRAINT chk_like_target CHECK (
    (review_id IS NOT NULL AND list_collection_id IS NULL AND comment_id IS NULL) OR
    (review_id IS NULL AND list_collection_id IS NOT NULL AND comment_id IS NULL) OR
    (review_id IS NULL AND list_collection_id IS NULL AND comment_id IS NOT NULL)
  )
);
-- Need separate unique constraints for each like type due to NULLs in PK
CREATE UNIQUE INDEX idx_likes_user_review ON public.likes (user_id, review_id) WHERE review_id IS NOT NULL;
CREATE UNIQUE INDEX idx_likes_user_list ON public.likes (user_id, list_collection_id) WHERE list_collection_id IS NOT NULL;
CREATE UNIQUE INDEX idx_likes_user_comment ON public.likes (user_id, comment_id) WHERE comment_id IS NOT NULL;

-- Function to update like_count on parent entity
CREATE OR REPLACE FUNCTION public.update_parent_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.review_id IS NOT NULL THEN
      UPDATE public.reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;
    ELSIF NEW.list_collection_id IS NOT NULL THEN
      UPDATE public.list_collections SET like_count = like_count + 1 WHERE id = NEW.list_collection_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
      UPDATE public.comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.review_id IS NOT NULL THEN
      UPDATE public.reviews SET like_count = like_count - 1 WHERE id = OLD.review_id;
    ELSIF OLD.list_collection_id IS NOT NULL THEN
      UPDATE public.list_collections SET like_count = like_count - 1 WHERE id = OLD.list_collection_id;
    ELSIF OLD.comment_id IS NOT NULL THEN
      UPDATE public.comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_parent_like_count();


-- Follows Table
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);
CREATE INDEX idx_follows_follower ON public.follows (follower_id);
CREATE INDEX idx_follows_following ON public.follows (following_id);


-- Notifications Table
CREATE TYPE public.notification_type AS ENUM (
  'new_follower',
  'like_review',
  'comment_review',
  'reply_comment_review', -- Reply to a comment on a review
  'like_list',
  'comment_list',
  'reply_comment_list' -- Reply to a comment on a list
  -- Add more: like_comment, mention_user, etc.
);
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE, -- The user who receives the notification
  actor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE, -- The user who performed the action
  type public.notification_type NOT NULL,
  entity_id UUID, -- ID of the review, list, comment, or user profile being acted upon
  entity_type TEXT, -- e.g., 'review', 'list_collection', 'comment', 'user_profile'
  entity_parent_id UUID, -- e.g., if entity is a comment, parent could be review_id or list_id
  entity_parent_title TEXT, -- e.g., title of the book/list the review/comment belongs to
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_actor_id ON public.notifications (actor_id);

-- RLS Policies (EXAMPLES - review and customize thoroughly)
-- Enable RLS for all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_book_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User Profiles:
CREATE POLICY "Users can view all profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- No delete policy for profiles by users, admin only.

-- Books: (Generally public, assuming admin/service_role populates them)
CREATE POLICY "Users can view all books" ON public.books FOR SELECT USING (true);
-- Allow service_role to manage books
CREATE POLICY "Service role can manage books" ON public.books FOR ALL USING (true) WITH CHECK (true);


-- User Book Interactions:
CREATE POLICY "Users can manage their own book interactions" ON public.user_book_interactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view interactions of users they follow (if public)" ON public.user_book_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid() AND following_id = user_id
    )
    -- Add more conditions for public profiles/interactions if needed
  );


-- Reviews:
CREATE POLICY "Users can view all reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- List Collections:
CREATE POLICY "View public lists or own private lists" ON public.list_collections FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own lists" ON public.list_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lists" ON public.list_collections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lists" ON public.list_collections FOR DELETE USING (auth.uid() = user_id);

-- List Items:
CREATE POLICY "View items of lists they can view" ON public.list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.list_collections lc
      WHERE lc.id = list_collection_id AND (lc.is_public = TRUE OR lc.user_id = auth.uid())
    )
  );
CREATE POLICY "Users can manage items in their own lists" ON public.list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.list_collections lc
      WHERE lc.id = list_collection_id AND lc.user_id = auth.uid()
    )
  )
  WITH CHECK (
     EXISTS (
      SELECT 1 FROM public.list_collections lc
      WHERE lc.id = list_collection_id AND lc.user_id = auth.uid()
    )
  );

-- Comments:
CREATE POLICY "Users can view all comments" ON public.comments FOR SELECT USING (true); -- Adjust based on parent visibility
CREATE POLICY "Users can insert their own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments or comments on their content" ON public.comments FOR DELETE
  USING (
    auth.uid() = user_id OR
    (review_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id = auth.uid())) OR
    (list_collection_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.list_collections lc WHERE lc.id = list_collection_id AND lc.user_id = auth.uid()))
  );

-- Likes:
CREATE POLICY "Users can view all likes" ON public.likes FOR SELECT USING (true); -- Or restrict based on privacy
CREATE POLICY "Users can manage their own likes" ON public.likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Follows:
CREATE POLICY "Users can view all follow relationships" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follow actions" ON public.follows FOR ALL
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- Notifications:
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update (mark as read) their own notifications" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- No insert/delete by users typically, these are system generated.

-- Storage Buckets (Example policies - adapt to your needs)
-- For user avatars
-- CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload their own avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );
-- CREATE POLICY "Users can update their own avatar." ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );
-- CREATE POLICY "Users can delete their own avatar." ON storage.objects FOR DELETE WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

-- For book covers (if you host them)
-- CREATE POLICY "Book covers are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'book-covers');
-- CREATE POLICY "Service role can manage book covers." ON storage.objects FOR ALL USING (bucket_id = 'book-covers' AND get_my_claim('role') = '"service_role"');

-- Note: get_my_claim might need to be a custom function or use Supabase's built-in role checks.
-- This schema is a starting point. You'll likely need to add more indexes, constraints,
-- and refine RLS policies based on your specific application requirements.
-- Consider using views for complex queries or denormalized data for performance in some cases.

-- Additional helper functions might be useful, e.g., to check if a user is following another.
CREATE OR REPLACE FUNCTION public.is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_currently_following BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = p_follower_id AND following_id = p_following_id
  ) INTO is_currently_following;
  RETURN is_currently_following;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats (followers, following) - can be called via RPC
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS TABLE(follower_count BIGINT, following_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id) AS follower_count,
    (SELECT COUNT(*) FROM public.follows WHERE follower_id = p_user_id) AS following_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- After creating tables and RLS, ensure you grant usage on schema and select on tables to 'anon' and 'authenticated' roles as needed.
-- Supabase Dashboard typically handles default grants, but review them.
-- For example:
-- GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated; -- Be restrictive, then open up with RLS
-- GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated; -- Again, RLS is key
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
