import type { ListCollection, Book, PaginatedResponse, Comment } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';

const API_BASE_URL = '/api'; // Adjust

export async function createList(listData: Pick<ListCollection, 'name' | 'description' | 'is_public'>): Promise<ListCollection> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('list_collections')
      .insert({
        user_id: currentUserId,
    name: listData.name,
    description: listData.description,
    is_public: listData.is_public,
      })
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
    like_count: 0,
    current_user_has_liked: false,
    books: [],
      cover_images: [],
  };
  } catch (error) {
    console.error('Failed to create list:', error);
    throw error;
  }
}

export async function getListDetails(listId: string): Promise<ListCollection | null> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('list_collections')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id),
        books:list_items(
          book:books(*)
        )
      `)
      .eq('id', listId)
      .eq('likes.user_id', currentUserId || '')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Transform the data structure
    const books = data.books?.map((item: any) => item.book) || [];
    const coverImages = books.slice(0, 4).map((book: any) => book.cover_image_url).filter(Boolean);

    return {
      ...data,
      current_user_has_liked: data.current_user_has_liked?.length > 0 || false,
      books,
      cover_images: coverImages,
    };
  } catch (error) {
    console.error('Failed to get list details:', error);
    throw error;
  }
}

export async function updateListDetails(listId: string, listData: Partial<Pick<ListCollection, 'name' | 'description' | 'is_public'>>): Promise<ListCollection> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('list_collections')
      .update(listData)
      .eq('id', listId)
      .eq('user_id', currentUserId) // Ensure user can only update their own list
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update list:', error);
    throw error;
  }
}

export async function deleteList(listId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('list_collections')
      .delete()
      .eq('id', listId)
      .eq('user_id', currentUserId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete list:', error);
    throw error;
  }
}

export async function addBookToList(listId: string, bookId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if user owns the list
    const { data: list } = await supabase
      .from('list_collections')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (!list || list.user_id !== currentUserId) {
      throw new Error('List not found or unauthorized');
    }

    // Check if book is already in the list
    const { data: existingItem } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_collection_id', listId)
      .eq('book_id', bookId)
      .single();

    if (existingItem) return; // Book already in list

    // Get the current max sort order
    const { data: maxOrder } = await supabase
      .from('list_items')
      .select('sort_order')
      .eq('list_collection_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (maxOrder?.sort_order || 0) + 1;

    const { error } = await supabase
      .from('list_items')
      .insert({
        list_collection_id: listId,
        book_id: bookId,
        sort_order: nextSortOrder,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to add book to list:', error);
    throw error;
  }
}

export async function removeBookFromList(listId: string, bookId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if user owns the list
    const { data: list } = await supabase
      .from('list_collections')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (!list || list.user_id !== currentUserId) {
      throw new Error('List not found or unauthorized');
    }

    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_collection_id', listId)
      .eq('book_id', bookId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to remove book from list:', error);
    throw error;
  }
}

export async function getListBooks(listId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    const { data, error, count } = await supabase
      .from('list_items')
      .select(`
        book:books(*)
      `, { count: 'exact' })
      .eq('list_collection_id', listId)
      .range(offset, offset + pageSize - 1)
      .order('sort_order', { ascending: true })
      .order('added_at', { ascending: true });

    if (error) throw error;

    const books = data?.map((item: any) => item.book) || [];
    
    // Add user interaction data
    const enrichedBooks = await enrichBooksWithUserData(books, currentUserId || undefined);

    return {
      items: enrichedBooks,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get list books:', error);
    throw error;
  }
}

async function enrichBooksWithUserData(books: any[], userId?: string): Promise<Book[]> {
  if (books.length === 0) return [];

  try {
    const bookIds = books.map(book => book.id).filter(Boolean);
    let interactionMap = new Map();
    
    if (userId && bookIds.length > 0) {
      const { data: interactions } = await supabase
        .from('user_book_interactions')
        .select('*')
        .eq('user_id', userId)
        .in('book_id', bookIds);

      interactions?.forEach(interaction => {
        interactionMap.set(interaction.book_id, interaction);
      });
    }

    return books.map(book => {
      const interaction = interactionMap.get(book.id);
      
      // Convert database format to frontend format
      const processedBook: Book = {
        ...book,
        // Fix authors array to string conversion
        author: Array.isArray(book.authors) && book.authors.length > 0 
          ? book.authors.join(', ') 
          : book.author || 'Unknown Author',
        // Fix cover image URL mapping
        coverImageUrl: book.cover_image_url || book.coverImageUrl,
        // Fix rating mapping
        averageRating: book.average_rating || book.averageRating,
        // User interaction data
        currentUserRating: interaction?.rating,
        currentUserIsRead: interaction?.is_read || false,
        currentUserReadDate: interaction?.read_date,
        currentUserIsOnWatchlist: interaction?.is_on_watchlist || false,
        currentUserIsLiked: interaction?.is_liked || false,
        currentUserIsOwned: interaction?.is_owned || false,
      };
      
      return processedBook;
    });
  } catch (error) {
    console.error('Failed to enrich books with user data:', error);
    return books.map(book => ({
      ...book,
      author: Array.isArray(book.authors) && book.authors.length > 0 
        ? book.authors.join(', ') 
        : book.author || 'Unknown Author',
      coverImageUrl: book.cover_image_url || book.coverImageUrl,
      averageRating: book.average_rating || book.averageRating,
    }));
}
}

export async function likeList(listId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('list_collection_id', listId)
      .single();

    if (existingLike) return; // Already liked

    // Get the list to create notification
    const { data: list } = await supabase
      .from('list_collections')
      .select('user_id, name')
      .eq('id', listId)
      .single();

    if (!list) throw new Error('List not found');

    // Insert like
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: currentUserId,
        list_collection_id: listId,
      });

    if (error) throw error;

    // Create notification if not liking own list
    if (list.user_id !== currentUserId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: list.user_id,
          actor_id: currentUserId,
          type: 'like_list',
          entity_type: 'list_collection',
          entity_id: listId,
          entity_parent_title: list.name,
          read: false,
        });
    }
  } catch (error) {
    console.error('Failed to like list:', error);
    throw error;
  }
}

export async function unlikeList(listId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', currentUserId)
      .eq('list_collection_id', listId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to unlike list:', error);
    throw error;
  }
}

export async function getListComments(listId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Comment>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    // Get top-level comments first
    const { data, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id)
      `, { count: 'exact' })
      .eq('list_collection_id', listId)
      .is('parent_comment_id', null)
      .eq('likes.user_id', currentUserId || '')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // For each top-level comment, get its replies
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment: any) => {
        const replies = await getCommentReplies(comment.id, currentUserId);
        return {
          ...comment,
          current_user_has_liked: comment.current_user_has_liked?.length > 0 || false,
          replies,
        };
      })
    );

    return {
      items: commentsWithReplies,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get list comments:', error);
    throw error;
  }
}

async function getCommentReplies(parentCommentId: string, currentUserId?: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id)
      `)
      .eq('parent_comment_id', parentCommentId)
      .eq('likes.user_id', currentUserId || '')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((reply: any) => ({
      ...reply,
      current_user_has_liked: reply.current_user_has_liked?.length > 0 || false,
    }));
  } catch (error) {
    console.error('Failed to get comment replies:', error);
    return [];
  }
}

export async function addCommentToList(listId: string, text: string, parentCommentId?: string): Promise<Comment> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Get the list info for notifications
    const { data: list } = await supabase
      .from('list_collections')
      .select('user_id, name')
      .eq('id', listId)
      .single();

    if (!list) throw new Error('List not found');

    // If replying to a comment, get the parent comment info
    let parentComment = null;
    if (parentCommentId) {
      const { data } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();
      parentComment = data;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: currentUserId,
    list_collection_id: listId,
    parent_comment_id: parentCommentId,
    text,
      })
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();

    if (error) throw error;

    // Create notifications
    if (parentCommentId && parentComment && parentComment.user_id !== currentUserId) {
      // Notify the parent comment author
      await supabase
        .from('notifications')
        .insert({
          user_id: parentComment.user_id,
          actor_id: currentUserId,
          type: 'reply_comment',
          entity_type: 'comment',
          entity_id: data.id,
          entity_parent_id: listId,
          entity_parent_title: list.name,
          read: false,
        });
    } else if (!parentCommentId && list.user_id !== currentUserId) {
      // Notify the list author for top-level comments
      await supabase
        .from('notifications')
        .insert({
          user_id: list.user_id,
          actor_id: currentUserId,
          type: 'comment_list',
          entity_type: 'comment',
          entity_id: data.id,
          entity_parent_id: listId,
          entity_parent_title: list.name,
          read: false,
        });
    }

    return {
      ...data,
      current_user_has_liked: false,
    like_count: 0,
  };
  } catch (error) {
    console.error('Failed to add comment to list:', error);
    throw error;
  }
}

export async function searchLists(query: string, page: number = 1, pageSize: number = 20, filters?: Record<string,any>): Promise<PaginatedResponse<ListCollection>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    let dbQuery = supabase
      .from('list_collections')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id),
        cover_images:list_items!inner(book:books!inner(cover_image_url))
      `, { count: 'exact' })
      .eq('is_public', true) // Only search public lists
      .eq('likes.user_id', currentUserId || '');

    // Apply search filters
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error, count } = await dbQuery
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const lists = data?.map((list: any) => ({
      ...list,
      current_user_has_liked: list.current_user_has_liked?.length > 0 || false,
      cover_images: list.cover_images?.slice(0, 4).map((item: any) => item.book.cover_image_url).filter(Boolean) || [],
    })) || [];

    return {
      items: lists,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to search lists:', error);
    throw error;
  }
}

// More functions: updateListItemOrder, etc.
