-- Add currently reading status to user_book_interactions table
-- This script adds the is_currently_reading column and creates proper constraints

-- Add the new column
ALTER TABLE user_book_interactions 
ADD COLUMN is_currently_reading BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_book_interactions.is_currently_reading IS 'Whether the user is currently reading this book';

-- Create a constraint to ensure logical consistency:
-- A book cannot be both currently reading and read at the same time
ALTER TABLE user_book_interactions 
ADD CONSTRAINT check_reading_status 
CHECK (NOT (is_currently_reading = TRUE AND is_read = TRUE));

-- Create an index for performance on currently reading queries
CREATE INDEX idx_user_book_interactions_currently_reading 
ON user_book_interactions(user_id, is_currently_reading) 
WHERE is_currently_reading = TRUE;

-- Update existing records: if a book is on watchlist but not read, 
-- we could optionally set some to currently reading, but we'll leave that for manual user action

-- Create a function to automatically handle status transitions
CREATE OR REPLACE FUNCTION handle_reading_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- When a book is marked as read, automatically remove from currently reading
    IF NEW.is_read = TRUE AND OLD.is_read IS DISTINCT FROM TRUE THEN
        NEW.is_currently_reading = FALSE;
    END IF;
    
    -- When a book is marked as currently reading, remove from watchlist
    IF NEW.is_currently_reading = TRUE AND OLD.is_currently_reading IS DISTINCT FROM TRUE THEN
        NEW.is_on_watchlist = FALSE;
    END IF;
    
    -- When a book is added to watchlist, remove from currently reading
    IF NEW.is_on_watchlist = TRUE AND OLD.is_on_watchlist IS DISTINCT FROM TRUE THEN
        NEW.is_currently_reading = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle automatic status transitions
DROP TRIGGER IF EXISTS trigger_reading_status_transition ON user_book_interactions;
CREATE TRIGGER trigger_reading_status_transition
    BEFORE UPDATE ON user_book_interactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_reading_status_transition(); 