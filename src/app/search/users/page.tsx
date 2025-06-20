"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, List, Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { searchUsers } from '@/lib/services/userService';
import { searchLists } from '@/lib/services/listService';
import type { UserProfile, ListCollection, PaginatedResponse } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { followUser, unfollowUser } from '@/lib/services/userService';
import { ListCard } from '@/components/lists/ListCard';

export default function UserSearchPage() {
  const { userProfile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [lists, setLists] = useState<ListCollection[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [listsPage, setListsPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [listsTotalPages, setListsTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState('users');

  const searchUsersData = async (page = 1, append = false) => {
    if (!query.trim()) return;
    
    setIsLoadingUsers(true);
    try {
      const response: PaginatedResponse<UserProfile> = await searchUsers(query, page, 20);
      if (append) {
        setUsers(prev => [...prev, ...response.items]);
      } else {
        setUsers(response.items);
      }
      setUsersTotalPages(response.totalPages);
      setUsersPage(page);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast({ title: 'Error', description: 'Failed to search users', variant: 'destructive' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const searchListsData = async (page = 1, append = false) => {
    if (!query.trim()) return;
    
    setIsLoadingLists(true);
    try {
      const response: PaginatedResponse<ListCollection> = await searchLists(query, page, 20);
      if (append) {
        setLists(prev => [...prev, ...response.items]);
      } else {
        setLists(response.items);
      }
      setListsTotalPages(response.totalPages);
      setListsPage(page);
    } catch (error) {
      console.error('Failed to search lists:', error);
      toast({ title: 'Error', description: 'Failed to search lists', variant: 'destructive' });
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    
    setUsers([]);
    setLists([]);
    setUsersPage(1);
    setListsPage(1);
    
    if (activeTab === 'users') {
      searchUsersData(1);
    } else {
      searchListsData(1);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (query.trim()) {
      if (tab === 'users' && users.length === 0) {
        searchUsersData(1);
      } else if (tab === 'lists' && lists.length === 0) {
        searchListsData(1);
      }
    }
  };

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    if (!isAuthenticated) {
      toast({ title: 'Login Required', description: 'Please login to follow users', variant: 'destructive' });
      return;
    }

    try {
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      
      // Update the user in the list
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              is_current_user_following: !isFollowing,
              follower_count: isFollowing ? (user.follower_count || 1) - 1 : (user.follower_count || 0) + 1
            }
          : user
      ));
      
      toast({ 
        title: isFollowing ? 'Unfollowed' : 'Following', 
        description: `You are ${isFollowing ? 'no longer following' : 'now following'} this user` 
      });
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      toast({ title: 'Error', description: 'Failed to update follow status', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold font-headline text-primary">Search Users & Lists</h1>
        
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for users or lists..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={!query.trim()}>
            Search
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {isLoadingUsers && users.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <Card key={user.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar_url || 'https://placehold.co/48x48.png'} alt={user.username} />
                          <AvatarFallback>{user.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Link href={`/profile/${user.username}`} className="hover:underline">
                            <CardTitle className="text-lg">{user.name || user.username}</CardTitle>
                          </Link>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{user.bio}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <span>{user.follower_count || 0} followers</span>
                          <span>{user.following_count || 0} following</span>
                        </div>
                        {isAuthenticated && userProfile?.id !== user.id && (
                          <Button
                            size="sm"
                            variant={user.is_current_user_following ? "secondary" : "default"}
                            onClick={() => handleFollowToggle(user.id, user.is_current_user_following || false)}
                          >
                            {user.is_current_user_following ? 'Following' : 'Follow'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {usersPage < usersTotalPages && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => searchUsersData(usersPage + 1, true)}
                    disabled={isLoadingUsers}
                    variant="outline"
                  >
                    {isLoadingUsers ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Users'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : query && !isLoadingUsers ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found for "{query}"</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          {isLoadingLists && lists.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : lists.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
              
              {listsPage < listsTotalPages && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => searchListsData(listsPage + 1, true)}
                    disabled={isLoadingLists}
                    variant="outline"
                  >
                    {isLoadingLists ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Lists'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : query && !isLoadingLists ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No lists found for "{query}"</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {!query && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Enter a search term to find users and lists</p>
        </div>
      )}
    </div>
  );
}
