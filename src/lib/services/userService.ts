import type { UserProfile, PaginatedResponse, Book, Review, ListCollection, UserBookInteraction, Notification } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';

const API_BASE_URL = '/api'; // Adjust

export async function getUserProfile(username: string): Promise<UserProfile | null> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        follower_count:follows!following_id(count),
        following_count:follows!follower_id(count),
        is_current_user_following:follows!following_id!inner(follower_id)
      `)
      .eq('username', username)
      .eq('follows.follower_id', currentUserId || '')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

     return {
      ...data,
      follower_count: data.follower_count?.[0]?.count || 0,
      following_count: data.following_count?.[0]?.count || 0,
      is_current_user_following: data.is_current_user_following?.length > 0 || false,
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
}

export async function updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        name: profileData.name,
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
      })
      .eq('id', currentUserId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
}

export async function searchUsers(query: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<UserProfile>> {
  try {
    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
      .range(offset, offset + pageSize - 1)
      .order('username');

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to search users:', error);
    throw error;
  }
}

export async function followUser(userIdToFollow: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUserId,
        following_id: userIdToFollow,
      });

    if (error) throw error;

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userIdToFollow,
        actor_id: currentUserId,
        type: 'new_follower',
        entity_type: 'user',
        entity_id: currentUserId,
        read: false,
      });
  } catch (error) {
    console.error('Failed to follow user:', error);
    throw error;
  }
}

export async function unfollowUser(userIdToUnfollow: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', userIdToUnfollow);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to unfollow user:', error);
    throw error;
  }
}

export async function getUserFollowers(userId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<UserProfile>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    const { data, error, count } = await supabase
      .from('follows')
      .select(`
        follower:user_profiles!follower_id(
          *,
          is_current_user_following:follows!following_id!inner(follower_id)
        )
      `, { count: 'exact' })
      .eq('following_id', userId)
      .eq('follower.follows.follower_id', currentUserId || '')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const followers = data?.map((item: any) => ({
      ...item.follower,
      is_current_user_following: item.follower?.is_current_user_following?.length > 0 || false,
    })) || [];

    return {
      items: followers,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user followers:', error);
    throw error;
  }
}

export async function getUserFollowing(userId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<UserProfile>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    const { data, error, count } = await supabase
      .from('follows')
      .select(`
        following:user_profiles!following_id(
          *,
          is_current_user_following:follows!following_id!inner(follower_id)
        )
      `, { count: 'exact' })
      .eq('follower_id', userId)
      .eq('following.follows.follower_id', currentUserId || '')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const following = data?.map((item: any) => ({
      ...item.following,
      is_current_user_following: item.following?.is_current_user_following?.length > 0 || false,
    })) || [];

    return {
      items: following,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user following:', error);
    throw error;
  }
}

export async function getUserReadBooks(userId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<UserBookInteraction>> {
  try {
    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('user_book_interactions')
      .select(`
        *,
        book:books(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', true)
      .range(offset, offset + pageSize - 1)
      .order('read_date', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user read books:', error);
    throw error;
  }
}

export async function getUserWatchlist(userId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<UserBookInteraction>> {
  try {
    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('user_book_interactions')
      .select(`
        *,
        book:books(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_on_watchlist', true)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user watchlist:', error);
    throw error;
  }
}

export async function getUserLikedBooks(userId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<UserBookInteraction>> {
  try {
    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('user_book_interactions')
      .select(`
        *,
        book:books(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_liked', true)
      .range(offset, offset + pageSize - 1)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user liked books:', error);
    throw error;
  }
}

export async function getUserOwnedBooks(userId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<UserBookInteraction>> {
  try {
    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('user_book_interactions')
      .select(`
        *,
        book:books(*)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_owned', true)
      .range(offset, offset + pageSize - 1)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user owned books:', error);
    throw error;
  }
}

export async function getUserReviews(userId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Review>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    const { data, error, count } = await supabase
      .from('reviews')
      .select(`
        *,
        user:user_profiles(*),
        book:books(*),
        current_user_has_liked:likes!left(user_id)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('likes.user_id', currentUserId || '')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviews = data?.map(review => ({
      ...review,
      current_user_has_liked: review.current_user_has_liked?.length > 0 || false,
    })) || [];

    return {
      items: reviews,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get user reviews:', error);
    throw error;
  }
}

export async function getUserLists(userId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<ListCollection>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    const { data, error, count } = await supabase
      .from('list_collections')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id),
        cover_images:list_items!inner(book:books!inner(cover_image_url))
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('likes.user_id', currentUserId || '')
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
    console.error('Failed to get user lists:', error);
    throw error;
  }
}

export async function getHomeFeed(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<any>> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const offset = (page - 1) * pageSize;
    
    // Get activities from followed users
    // This is a simplified version - in production you'd want a dedicated feed table
    const { data: followingIds } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId);

    const followingUserIds = followingIds?.map(f => f.following_id) || [];
    
    if (followingUserIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // Get recent reviews from followed users
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        *,
        user:user_profiles(*),
        book:books(*)
      `)
      .in('user_id', followingUserIds)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (reviewsError) throw reviewsError;

    // Get recent lists from followed users
    const { data: lists, error: listsError } = await supabase
      .from('list_collections')
      .select(`
        *,
        user:user_profiles(*),
        cover_images:list_items!inner(book:books!inner(cover_image_url))
      `)
      .in('user_id', followingUserIds)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (listsError) throw listsError;

    // Get recent book interactions from followed users
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_book_interactions')
      .select(`
        *,
        user:user_profiles(*),
        book:books(*)
      `)
      .in('user_id', followingUserIds)
      .eq('is_read', true)
      .not('read_date', 'is', null)
      .order('read_date', { ascending: false })
      .limit(pageSize);

    if (interactionsError) throw interactionsError;

    // Combine and sort all activities by date
    const activities = [
      ...(reviews || []).map(review => ({
        type: 'review',
        id: review.id,
        user: review.user,
        book: review.book,
        data: review,
        created_at: review.created_at,
      })),
      ...(lists || []).map(list => ({
        type: 'list',
        id: list.id,
        user: list.user,
                 data: {
           ...list,
           cover_images: list.cover_images?.slice(0, 4).map((item: any) => item.book.cover_image_url).filter(Boolean) || [],
         },
        created_at: list.created_at,
      })),
      ...(interactions || []).map(interaction => ({
        type: 'read_book',
        id: `${interaction.user_id}-${interaction.book_id}`,
        user: interaction.user,
        book: interaction.book,
        data: interaction,
        created_at: interaction.read_date || interaction.updated_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paginatedActivities = activities.slice(offset, offset + pageSize);

    return {
      items: paginatedActivities,
      total: activities.length,
      page,
      pageSize,
      totalPages: Math.ceil(activities.length / pageSize),
    };
  } catch (error) {
    console.error('Failed to get home feed:', error);
    throw error;
  }
}

export async function getNotifications(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Notification>> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:user_profiles!actor_id(*)
      `, { count: 'exact' })
      .eq('user_id', currentUserId)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get notifications:', error);
    throw error;
  }
}

export async function markNotificationsAsRead(notificationIds?: string[]): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUserId);

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    }

    const { error } = await query;
    if (error) throw error;
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    throw error;
  }
}

export async function getAnalyticsData(): Promise<any> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Get basic counts
    const [
      booksReadResult,
      reviewsResult,
      listsResult,
      likesResult,
      commentsResult,
    ] = await Promise.all([
      supabase
        .from('user_book_interactions')
        .select('*', { count: 'exact' })
        .eq('user_id', currentUserId)
        .eq('is_read', true),
      
      supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('user_id', currentUserId),
      
      supabase
        .from('list_collections')
        .select('*', { count: 'exact' })
        .eq('user_id', currentUserId),
      
      // Get likes on user's reviews
      (async () => {
        const { data: userReviews } = await supabase
          .from('reviews')
          .select('id')
          .eq('user_id', currentUserId);
        
        const reviewIds = userReviews?.map(r => r.id) || [];
        
        if (reviewIds.length === 0) {
          return { count: 0 };
        }
        
        return supabase
          .from('likes')
          .select('*', { count: 'exact' })
          .eq('entity_type', 'review')
          .in('entity_id', reviewIds);
      })(),
      
      supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('user_id', currentUserId),
    ]);

    // Get average rating
    const { data: ratingsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('user_id', currentUserId)
      .not('rating', 'is', null);

    const averageRating = (ratingsData && ratingsData.length > 0) 
      ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length 
      : 0;

    // Get genre distribution
    const { data: genreData } = await supabase
      .from('user_book_interactions')
      .select(`
        book:books(genre)
      `)
      .eq('user_id', currentUserId)
      .eq('is_read', true)
      .not('books.genre', 'is', null);

    const genreCount: { [key: string]: number } = {};
    genreData?.forEach((item: any) => {
      if (item.book?.genre) {
        genreCount[item.book.genre] = (genreCount[item.book.genre] || 0) + 1;
      }
    });

    const genreDistribution = Object.entries(genreCount)
      .map(([genre, count]) => ({ genre, count, color: '#8884d8' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Get monthly reading data
    const { data: monthlyData } = await supabase
      .from('user_book_interactions')
      .select('read_date')
      .eq('user_id', currentUserId)
      .eq('is_read', true)
      .not('read_date', 'is', null)
      .order('read_date', { ascending: true });

    const monthlyReading: { [key: string]: { books: number; reviews: number } } = {};
    monthlyData?.forEach(item => {
      if (item.read_date) {
        const month = new Date(item.read_date).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyReading[month]) {
          monthlyReading[month] = { books: 0, reviews: 0 };
        }
        monthlyReading[month].books++;
      }
    });

    // Add reviews to monthly data
    const { data: monthlyReviewsData } = await supabase
      .from('reviews')
      .select('created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });

    monthlyReviewsData?.forEach(item => {
      const month = new Date(item.created_at).toISOString().slice(0, 7);
      if (!monthlyReading[month]) {
        monthlyReading[month] = { books: 0, reviews: 0 };
      }
      monthlyReading[month].reviews++;
    });

    const monthlyReadingArray = Object.entries(monthlyReading)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        books: data.books,
        reviews: data.reviews
      }))
      .slice(-12); // Last 12 months

    // Get rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: ratingsData?.filter(r => r.rating === rating).length || 0
    }));

    // Get top authors
    const { data: authorData } = await supabase
      .from('user_book_interactions')
      .select(`
        book:books(authors)
      `)
      .eq('user_id', currentUserId)
      .eq('is_read', true)
      .not('books.authors', 'is', null);

    const authorCount: { [key: string]: number } = {};
    authorData?.forEach((item: any) => {
      if (item.book?.authors && Array.isArray(item.book.authors)) {
        item.book.authors.forEach((author: string) => {
          if (author && author.trim()) {
            authorCount[author] = (authorCount[author] || 0) + 1;
          }
        });
      }
    });

    const topAuthors = Object.entries(authorCount)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate reading streak (simplified - just days with activity)
    const { data: recentActivity } = await supabase
      .from('user_book_interactions')
      .select('read_date')
      .eq('user_id', currentUserId)
      .eq('is_read', true)
      .not('read_date', 'is', null)
      .order('read_date', { ascending: false })
      .limit(30);

    let readingStreak = 0;
    if (recentActivity && recentActivity.length > 0) {
      const today = new Date();
      const dates = recentActivity.map(item => new Date(item.read_date!));
      const uniqueDates = [...new Set(dates.map(d => d.toDateString()))];
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        if (uniqueDates.includes(checkDate.toDateString())) {
          readingStreak++;
        } else {
          break;
        }
      }
    }

    return {
      totalBooksRead: booksReadResult.count || 0,
      totalReviews: reviewsResult.count || 0,
      totalLists: listsResult.count || 0,
      totalLikes: likesResult.count || 0,
      totalComments: commentsResult.count || 0,
      averageRating,
      readingStreak,
      pagesRead: 0, // We don't track pages currently
      genreDistribution,
      monthlyReading: monthlyReadingArray,
      ratingDistribution,
      topAuthors,
      readingYears: [], // Could be calculated if needed
      recentActivity: [], // Could be calculated if needed
    };
  } catch (error) {
    console.error('Failed to get analytics data:', error);
    throw error;
  }
}
