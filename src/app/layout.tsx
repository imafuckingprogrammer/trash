"use client"; // Required for AuthProvider and useAuth

import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, User, LogIn, LogOut, Search, List, HomeIcon, Bell, Settings, UserPlus, Moon, Sun, BarChart3 } from 'lucide-react';
import './globals.css';
import { Button } from '@/components/ui/button';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext'; // Import AuthProvider and useAuth
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { getNotifications } from '@/lib/services/userService';
import type { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';

function NotificationsDropdown() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      loadRecentNotifications();
    }
  }, [isAuthenticated]);

  const loadRecentNotifications = async () => {
    try {
      const data = await getNotifications(1, 5); // Get first 5 notifications
      setNotifications(data.items);
      setUnreadCount(data.items.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'new_follower':
        return "started following you.";
      case 'like_review':
        return `liked your review of "${notification.entity_parent_title || 'a book'}".`;
      case 'comment_review':
        return `commented on your review of "${notification.entity_parent_title || 'a book'}".`;
      case 'reply_comment':
        return `replied to your comment on "${notification.entity_parent_title || 'a book'}".`;
      case 'like_list':
        return `liked your list "${notification.entity_parent_title || 'Untitled List'}".`;
      case 'comment_list':
        return `commented on your list "${notification.entity_parent_title || 'Untitled List'}".`;
      default:
        return "interacted with your content.";
    }
  };

  const getNotificationHref = (notification: Notification) => {
    switch (notification.type) {
      case 'new_follower':
        return `/profile/${notification.actor?.username}`;
      case 'like_review':
      case 'comment_review':
        return `/books/${notification.entity_parent_id}#review-${notification.entity_id}`;
      case 'reply_comment':
        return `/books/${notification.entity_parent_id}#comment-${notification.entity_id}`;
      case 'like_list':
      case 'comment_list':
        return `/lists/${notification.entity_parent_id || notification.entity_id}`;
      default:
        return "#";
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
              <Link href={getNotificationHref(notification)} className="flex items-start gap-3 py-2.5">
                  <Avatar className="h-8 w-8">
                  <AvatarImage src={notification.actor?.avatar_url || 'https://placehold.co/40x40.png'} alt={notification.actor?.username} />
                  <AvatarFallback>{notification.actor?.username?.substring(0,1)?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                <div className="flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{notification.actor?.username || 'Someone'}</span> {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-1 self-start shrink-0"></div>}
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center" asChild>
            <Link href="/notifications" className="text-sm text-primary hover:!bg-primary/10 cursor-pointer">
             View all notifications
            </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const { userProfile, isAuthenticated, logout, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl font-headline text-primary">LibroVision</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href={isAuthenticated ? "/feed" : "/"} className="text-foreground/70 transition-colors hover:text-foreground">
            Home
          </Link>
          <Link href="/discover" className="text-foreground/70 transition-colors hover:text-foreground">
            Discover
          </Link>
          {isAuthenticated && (
            <Link href="/lists" className="text-foreground/70 transition-colors hover:text-foreground">
              My Lists
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/search/users" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Find Users
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/search/lists" className="cursor-pointer">
                  <List className="mr-2 h-4 w-4" />
                  Find Lists
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse bg-muted rounded-md" />
          ) : isAuthenticated && userProfile ? (
            <>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <NotificationsDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile.avatar_url || 'https://placehold.co/40x40.png'} alt={userProfile.username} />
                      <AvatarFallback>{userProfile.username?.substring(0,1)?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{userProfile.name || userProfile.username}</div>
                    <div className="text-xs text-muted-foreground">@{userProfile.username}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href={`/profile/${userProfile.username}`}><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />Analytics</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Link href="/login">
                <Button variant="ghost">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8 bg-background">
      <div className="container text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} LibroVision. All rights reserved.
      </div>
    </footer>
  );
}

// export const metadata: Metadata = { // Metadata can be dynamic or moved to page level
//   title: 'LibroVision',
//   description: 'Discover your next favorite book.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased flex flex-col")}>
        <ThemeProvider>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
