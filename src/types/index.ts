// Represents an authenticated user from your auth provider (e.g., Supabase Auth)
export type AuthUser = {
  id: string; // Typically the UUID from the auth provider
  email?: string;
  // Add any other relevant fields from your auth provider
};

// Represents a user profile stored in your database
export type UserProfile = {
  id: string; // Foreign key to auth.users.id or a public user ID
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string; // ISO date string
  name?: string; // Optional full name
  follower_count?: number;
  following_count?: number;
  is_current_user_following?: boolean; // Is the logged-in user following this profile?
};

export type Book = {
  id: string; // Your internal book ID (could be UUID)
  google_book_id?: string;
  open_library_id?: string;
  title: string;
  author: string; // Simplified to a single string, could be array on backend
  coverImageUrl?: string;
  summary?: string;
  averageRating?: number; // App-wide average rating, fetched from backend
  genres?: string[];
  publicationYear?: number;
  isbn?: string;

  // These fields would typically be fetched based on the current authenticated user
  // and are made optional here.
  currentUserRating?: number;
  currentUserIsRead?: boolean;
  currentUserIsCurrentlyReading?: boolean;
  currentUserReadDate?: string;
  currentUserIsOnWatchlist?: boolean;
  currentUserIsLiked?: boolean;
  currentUserIsOwned?: boolean;
};

export type Review = {
  id: string;
  user_id: string;
  user?: UserProfile; // Populated by backend join
  book_id: string;
  book?: Pick<Book, 'id' | 'title' | 'coverImageUrl'>; // Populated by backend join
  rating: number;
  review_text?: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  like_count?: number;
  comment_count?: number;
  current_user_has_liked?: boolean;
};

export type Comment = {
  id: string;
  user_id: string;
  user?: UserProfile; // Populated by backend join
  // entity_id: string; // ID of the item being commented on (review, list)
  // entity_type: 'review' | 'list_collection';
  review_id?: string; // If comment is on a review
  list_collection_id?: string; // If comment is on a list
  parent_comment_id?: string; // For threaded replies
  text: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  like_count?: number;
  current_user_has_liked?: boolean;
  replies?: Comment[]; // Nested replies, often fetched separately or limited
};

export type ListCollection = {
  id: string;
  user_id: string;
  user?: UserProfile; // Populated by backend join
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  item_count?: number;
  like_count?: number;
  current_user_has_liked?: boolean;
  // books array might be fetched separately or as part of a detailed view
  books?: Book[]; // For client-side convenience after fetching list items
  cover_images?: string[]; // For list card display
};

export type ListItem = {
  id: string;
  list_collection_id: string;
  book_id: string;
  book?: Book; // Populated by backend join
  added_at: string;
  sort_order?: number;
};

// Represents an entry in the user's reading diary or interaction log
export type UserBookInteraction = {
  user_id: string;
  book_id: string;
  book?: Book; // Populated from join
  is_read?: boolean;
  is_currently_reading?: boolean;
  read_date?: string; // ISO date string
  rating?: number;
  is_owned?: boolean;
  is_on_watchlist?: boolean;
  is_liked?: boolean; // User liked the book itself
  log_notes?: string; // Short notes for diary, separate from full review
  review_id?: string; // Link to a full review if one exists
  created_at: string;
  updated_at: string;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type NotificationType = 
  | 'new_follower' 
  | 'like_review' 
  | 'comment_review' 
  | 'reply_comment'
  | 'like_list'
  | 'comment_list';
  // ... add more as needed

export type Notification = {
  id: string;
  user_id: string; // The user who receives the notification
  actor_id: string; // The user who performed the action
  actor?: UserProfile; // Populated by backend
  type: NotificationType;
  entity_id?: string; // ID of the review, list, comment, or user being followed
  entity_type?: 'review' | 'list_collection' | 'comment' | 'user';
  entity_parent_id?: string; // e.g., if entity is a comment, parent could be review_id
  entity_parent_title?: string; // e.g., title of the book/list the review/comment belongs to
  read: boolean;
  created_at: string;
};

// For API responses that include pagination
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Generic type for form submission status
export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';
export type FormError = { field?: string; message: string } | null;

