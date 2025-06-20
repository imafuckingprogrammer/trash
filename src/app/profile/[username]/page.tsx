
"use client"; 

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCard } from "@/components/books/BookCard";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ListCard } from "@/components/lists/ListCard";
import type { UserProfile as UserProfileType, Book, Review, ListCollection, UserBookInteraction, PaginatedResponse } from '@/types';
import { Edit3, Settings, UserPlus, UserCheck, Loader2, CalendarDays, Eye, Heart as HeartIcon, Library } from "lucide-react";
import { format } from 'date-fns';
import Link from 'next/link';
import { StarRating } from '@/components/ui/StarRating';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserProfile, 
  getUserReadBooks, 
  getUserReviews, 
  getUserLists, 
  getUserWatchlist, 
  getUserLikedBooks,
  getUserOwnedBooks,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing
} from '@/lib/services/userService';
import { likeReview as likeReviewService, unlikeReview as unlikeReviewService } from '@/lib/services/reviewService';
import { useToast } from '@/hooks/use-toast';

// TODO: Implement proper pagination for each tab's content

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { userProfile: currentUserProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setUsername(resolvedParams.username);
    });
  }, [params]);

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [userDiary, setUserDiary] = useState<UserBookInteraction[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [userLists, setUserLists] = useState<ListCollection[]>([]);
  const [userWatchlist, setUserWatchlist] = useState<UserBookInteraction[]>([]);
  const [userLikedBooks, setUserLikedBooks] = useState<UserBookInteraction[]>([]);
  const [userOwnedBooks, setUserOwnedBooks] = useState<UserBookInteraction[]>([]);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const [currentTab, setCurrentTab] = useState("diary"); // Default tab
  const [tabDataLoading, setTabDataLoading] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!username) return;
    setIsLoadingProfile(true);
    try {
      const fetchedProfile = await getUserProfile(username);
      if (fetchedProfile) {
        setProfile(fetchedProfile);
        setIsFollowing(fetchedProfile.is_current_user_following || false); // Assuming service provides this
      } else {
        toast({ title: "Error", description: "User profile not found.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [username, toast]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const fetchAllUserData = useCallback(async (userId: string) => {
    if (!userId) return;
    setTabDataLoading(true);
    try {
      // Load all data initially to get proper counts
      const [diaryData, reviewsData, listsData, watchlistData, likedData, ownedData] = await Promise.all([
        getUserReadBooks(userId),
        getUserReviews(userId),
        getUserLists(userId),
        getUserWatchlist(userId),
        getUserLikedBooks(userId),
        getUserOwnedBooks(userId)
      ]);
      
      setUserDiary(diaryData.items);
      setUserReviews(reviewsData.items);
      setUserLists(listsData.items);
      setUserWatchlist(watchlistData.items);
      setUserLikedBooks(likedData.items);
      setUserOwnedBooks(ownedData.items);
    } catch (error) {
        console.error('Failed to fetch user data:', error);
        toast({title: "Error", description: "Could not load user data.", variant: "destructive"});
    } finally {
        setTabDataLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (profile?.id) {
        fetchAllUserData(profile.id);
    }
  }, [profile, fetchAllUserData]);


  const handleLikeReview = async (reviewId: string) => {
    if (!isAuthenticated) { toast({title: "Login Required", variant: "destructive"}); return; }
    // Optimistic update would be complex here, better to re-fetch or update based on API response
    const review = userReviews.find(r => r.id === reviewId);
    if (!review) return;
    try {
      if (review.current_user_has_liked) await unlikeReviewService(reviewId);
      else await likeReviewService(reviewId);
      // Re-fetch reviews for the current user's profile page if it's their own review
      if (profile?.id) {
        const reviewsData = await getUserReviews(profile.id);
        setUserReviews(reviewsData.items);
      }
    } catch (error) {
      toast({title: "Error", description: "Failed to update like status.", variant: "destructive"});
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !profile || !currentUserProfile || currentUserProfile.id === profile.id) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profile.id);
        setProfile(p => p ? {...p, follower_count: (p.follower_count || 1) - 1} : null);
      } else {
        await followUser(profile.id);
        setProfile(p => p ? {...p, follower_count: (p.follower_count || 0) + 1} : null);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Follow/unfollow error:", error);
      toast({title: "Error", description: "Action failed.", variant: "destructive"});
    } finally {
      setIsFollowLoading(false);
    }
  };


  if (isLoadingProfile || authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-15rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return <div className="text-center py-10 text-destructive">User profile not found.</div>;
  }
  
  const isCurrentUserProfile = isAuthenticated && currentUserProfile?.id === profile.id;

  const stats = {
    booksRead: userDiary.length,
    reviewsWritten: userReviews.length,
    listsCreated: userLists.length,
    booksOnWatchlist: userWatchlist.length,
    booksLiked: userLikedBooks.length,
    booksOwned: userOwnedBooks.length,
  };


  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-xl rounded-lg">
        <CardHeader className="bg-gradient-to-br from-primary/20 via-background to-background p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url || 'https://placehold.co/128x128.png'} alt={profile.username} />
              <AvatarFallback className="text-4xl">{profile.username?.substring(0, 1)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left flex-grow">
              <CardTitle className="text-3xl md:text-4xl font-bold font-headline text-primary">{profile.name || profile.username}</CardTitle>
              <CardDescription className="text-md text-muted-foreground">@{profile.username}</CardDescription>
              <p className="text-sm text-muted-foreground mt-1">Joined {format(new Date(profile.created_at), "MMMM yyyy")}</p>
              <div className="mt-2 text-sm flex gap-4 justify-center md:justify-start">
                  <span className="cursor-pointer hover:underline"><strong>{profile.follower_count || 0}</strong> Followers</span>
                  <span className="cursor-pointer hover:underline"><strong>{profile.following_count || 0}</strong> Following</span>
              </div>
            </div>
            <div className="md:ml-auto flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 pt-4 md:pt-0">
              {isCurrentUserProfile ? (
                <Link href="/settings">
                  <Button variant="outline" className="transition-transform hover:scale-105 w-full md:w-auto">
                    <Settings className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                </Link>
              ) : isAuthenticated ? (
                <Button 
                    onClick={handleFollowToggle} 
                    disabled={isFollowLoading}
                    variant={isFollowing ? "secondary" : "default"}
                    className="w-full md:w-auto"
                >
                  {isFollowLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isFollowing ? <UserCheck className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4"/>)}
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              ) : (
                <Link href={`/login?redirect=/profile/${username}`}>
                    <Button className="w-full md:w-auto"><UserPlus className="mr-2 h-4 w-4"/> Follow</Button>
                </Link>
              )}
            </div>
          </div>
          {profile.bio && <p className="mt-4 text-center md:text-left text-foreground/80 whitespace-pre-wrap">{profile.bio}</p>}
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center border-t">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key}>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').replace('Books ', '')}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-6">
          <TabsTrigger value="diary">Diary</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
          <TabsTrigger value="owned">Owned</TabsTrigger>
        </TabsList>

        {tabDataLoading ? (
            <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : (
            <>
            <TabsContent value="diary">
                <Card>
                    <CardHeader><CardTitle>Reading Diary ({userDiary.length})</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                    {userDiary.length > 0 ? userDiary.map(entry => {
                        const book = entry.book; 
                        return (
                        <Card key={entry.book_id + (entry.read_date || '')} className="flex items-start space-x-4 p-4 shadow-sm">
                            {book?.coverImageUrl && (
                            <Link href={`/books/${book.id}`} className="block shrink-0">
                                <Image src={book.coverImageUrl} alt={book.title} width={60} height={90} className="rounded-lg object-cover aspect-[2/3]" />
                            </Link>
                            )}
                            <div className="flex-grow">
                            <Link href={`/books/${book?.id || '#'}`} className="hover:underline">
                                <h3 className="font-semibold text-lg text-primary">{book?.title || 'Unknown Book'}</h3>
                            </Link>
                            {entry.rating && <StarRating initialRating={entry.rating} readonly size={16} className="my-1" />}
                            {entry.read_date && 
                                <p className="text-sm text-muted-foreground flex items-center">
                                    <CalendarDays className="h-4 w-4 mr-1.5" /> Logged on {format(new Date(entry.read_date), "MMMM d, yyyy")}
                                </p>
                            }
                            {entry.log_notes && <p className="text-sm mt-1 italic text-foreground/80">"{entry.log_notes}"</p>}
                            {entry.review_id && book && (
                                <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                    <Link href={`/books/${book.id}#review-${entry.review_id}`}>View full review</Link>
                                </Button>
                            )}
                            </div>
                        </Card>
                        );
                    }) : <p className="text-muted-foreground text-center py-8">No books logged in the diary yet.</p>}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-6">
                {userReviews.length > 0 ? userReviews.map(review => 
                  <ReviewCard 
                    key={review.id} 
                    review={review} 
                    onLikeReview={handleLikeReview} 
                    onReplyToReview={async (id,text) => { console.log(id,text); return null; }} 
                    showBookLink={true} 
                  />
                ) 
                : <p className="text-muted-foreground text-center py-8">No reviews written yet.</p>}
              </div>
            </TabsContent>

            <TabsContent value="lists">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userLists.length > 0 ? userLists.map(list => <ListCard key={list.id} list={list} />)
                : <p className="text-muted-foreground text-center py-8 col-span-full">No lists created yet.</p>}
              </div>
            </TabsContent>

            {[
                {tab: "watchlist", data: userWatchlist, title: "Watchlist", emptyMsg: "Watchlist is empty.", emptyLink: "/discover", emptyLinkText: "Discover some books"},
                {tab: "likes", data: userLikedBooks, title: "Liked Books", emptyMsg: "No liked books yet.", emptyLink: "/discover", emptyLinkText: "Find books to like"},
                {tab: "owned", data: userOwnedBooks, title: "Owned Books", emptyMsg: "No books marked as owned.", emptyLink: "/discover", emptyLinkText: "Manage your collection"}
            ].map(tabInfo => (
                <TabsContent value={tabInfo.tab} key={tabInfo.tab}>
                    <Card>
                        <CardHeader><CardTitle>{tabInfo.title} ({tabInfo.data.length})</CardTitle></CardHeader>
                        <CardContent>
                            {tabInfo.data.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {tabInfo.data.map(interaction => interaction.book && <BookCard key={interaction.book_id} book={interaction.book} />)}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">{tabInfo.emptyMsg} {tabInfo.emptyLink && <Link href={tabInfo.emptyLink} className="text-primary hover:underline">{tabInfo.emptyLinkText}</Link>}</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            ))}
            </>
        )}
      </Tabs>
      
      {/* Footer for profile specific actions if any, like deactivating account (not implemented) */}
      {isCurrentUserProfile && (
        <div className="text-center mt-12 border-t pt-8">
            <Link href="/settings">
                <Button variant="outline">Account Settings</Button>
            </Link>
        </div>
      )}
    </div>
  );
}
// Renamed from profile/page.tsx to profile/[username]/page.tsx
// Original content of profile/page.tsx should redirect to the authenticated user's profile page.
