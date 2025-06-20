-- LibroVision Complete Database Setup Script
-- This script sets up all necessary triggers, functions, and RLS policies for the production application

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

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Books Policies (public read, authenticated write)
DROP POLICY IF EXISTS "Anyone can view books" ON public.books;
CREATE POLICY "Anyone can view books" ON public.books
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;
CREATE POLICY "Authenticated users can insert books" ON public.books
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update books" ON public.books;
CREATE POLICY "Authenticated users can update books" ON public.books
    FOR UPDATE USING (auth.role() = 'authenticated');

-- User Book Interactions Policies
DROP POLICY IF EXISTS "Users can view all interactions" ON public.user_book_interactions;
CREATE POLICY "Users can view all interactions" ON public.user_book_interactions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own interactions" ON public.user_book_interactions;
CREATE POLICY "Users can manage own interactions" ON public.user_book_interactions
    FOR ALL USING (auth.uid() = user_id);

-- Reviews Policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own reviews" ON public.reviews;
CREATE POLICY "Users can manage own reviews" ON public.reviews
    FOR ALL USING (auth.uid() = user_id);

-- List Collections Policies
DROP POLICY IF EXISTS "Anyone can view public lists" ON public.list_collections;
CREATE POLICY "Anyone can view public lists" ON public.list_collections
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own lists" ON public.list_collections;
CREATE POLICY "Users can manage own lists" ON public.list_collections
    FOR ALL USING (auth.uid() = user_id);

-- List Items Policies
DROP POLICY IF EXISTS "Users can view list items" ON public.list_items;
CREATE POLICY "Users can view list items" ON public.list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.list_collections 
            WHERE id = list_collection_id 
            AND (is_public = true OR user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can manage own list items" ON public.list_items;
CREATE POLICY "Users can manage own list items" ON public.list_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.list_collections 
            WHERE id = list_collection_id 
            AND user_id = auth.uid()
        )
    );

-- Comments Policies
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
CREATE POLICY "Users can view comments" ON public.comments
    FOR SELECT USING (
        (review_id IS NOT NULL) OR 
        (list_collection_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.list_collections 
            WHERE id = list_collection_id 
            AND (is_public = true OR user_id = auth.uid())
        ))
    );

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Likes Policies
DROP POLICY IF EXISTS "Users can view likes" ON public.likes;
CREATE POLICY "Users can view likes" ON public.likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
CREATE POLICY "Users can manage own likes" ON public.likes
    FOR ALL USING (auth.uid() = user_id);

-- Follows Policies
DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
CREATE POLICY "Users can view follows" ON public.follows
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own follows" ON public.follows;
CREATE POLICY "Users can manage own follows" ON public.follows
    FOR ALL USING (auth.uid() = follower_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================================================

-- Function to get follower count for a user
CREATE OR REPLACE FUNCTION public.get_follower_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.follows 
        WHERE following_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following count for a user
CREATE OR REPLACE FUNCTION public.get_following_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.follows 
        WHERE follower_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION public.check_is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.follows 
        WHERE follower_id = p_follower_id 
        AND following_id = p_following_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.notifications 
        WHERE user_id = p_user_id 
        AND read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

-- Function to create notification for new followers
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        entity_type,
        entity_id,
        read
    ) VALUES (
        NEW.following_id,
        NEW.follower_id,
        'new_follower',
        'user',
        NEW.follower_id,
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new follows
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created
    AFTER INSERT ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_follow();

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Function for full-text search on books
CREATE OR REPLACE FUNCTION public.search_books_fulltext(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    authors TEXT[],
    cover_image_url TEXT,
    summary TEXT,
    average_rating NUMERIC,
    total_ratings INTEGER,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        b.authors,
        b.cover_image_url,
        b.summary,
        b.average_rating,
        b.total_ratings,
        ts_rank(
            to_tsvector('english', b.title || ' ' || array_to_string(b.authors, ' ')),
            plainto_tsquery('english', p_query)
        ) as rank
    FROM public.books b
    WHERE 
        to_tsvector('english', b.title || ' ' || array_to_string(b.authors, ' ')) 
        @@ plainto_tsquery('english', p_query)
    ORDER BY rank DESC, b.average_rating DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for searching users
CREATE OR REPLACE FUNCTION public.search_users_fulltext(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    name TEXT,
    avatar_url TEXT,
    bio TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.name,
        u.avatar_url,
        u.bio,
        ts_rank(
            to_tsvector('english', u.username || ' ' || COALESCE(u.name, '')),
            plainto_tsquery('english', p_query)
        ) as rank
    FROM public.user_profiles u
    WHERE 
        to_tsvector('english', u.username || ' ' || COALESCE(u.name, '')) 
        @@ plainto_tsquery('english', p_query)
    ORDER BY rank DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to clean up old notifications (call this periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate book ratings (call this if data gets inconsistent)
CREATE OR REPLACE FUNCTION public.recalculate_book_ratings()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.books 
    SET 
        average_rating = COALESCE((
            SELECT AVG(rating) 
            FROM public.reviews 
            WHERE book_id = books.id
        ), 0),
        total_ratings = (
            SELECT COUNT(*) 
            FROM public.reviews 
            WHERE book_id = books.id
        );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_book_interactions_user_read ON public.user_book_interactions (user_id, is_read, read_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_book_interactions_user_watchlist ON public.user_book_interactions (user_id, is_on_watchlist, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_book_created ON public.reviews (book_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_list_items_list_order ON public.list_items (list_collection_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_comments_review_parent ON public.comments (review_id, parent_comment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_list_parent ON public.comments (list_collection_id, parent_comment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_likes_review_user ON public.likes (review_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_list_user ON public.likes (list_collection_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_user ON public.likes (comment_id, user_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_books_fts ON public.books USING GIN (to_tsvector('english', title || ' ' || array_to_string(authors, ' ')));
CREATE INDEX IF NOT EXISTS idx_user_profiles_fts ON public.user_profiles USING GIN (to_tsvector('english', username || ' ' || COALESCE(name, '')));
CREATE INDEX IF NOT EXISTS idx_list_collections_fts ON public.list_collections USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant read access to anonymous users for public data
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.user_profiles TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.list_collections TO anon;
GRANT SELECT ON public.list_items TO anon;
GRANT SELECT ON public.comments TO anon;

COMMENT ON SCHEMA public IS 'LibroVision - Complete setup applied successfully'; 