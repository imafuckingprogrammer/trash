"use client";

import { useAuth } from '@/contexts/OptimizedAuthContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock, 
  Target,
  Zap,
  Star,
  Heart,
  MessageCircle,
  Users,
  Trophy,
  Flame
} from 'lucide-react';
import { getAnalyticsData } from '@/lib/services/userService';

interface AnalyticsData {
  totalBooksRead: number;
  totalReviews: number;
  totalLists: number;
  totalLikes: number;
  totalComments: number;
  averageRating: number;
  readingStreak: number;
  pagesRead: number;
  genreDistribution: { genre: string; count: number; color: string }[];
  monthlyReading: { month: string; books: number; reviews: number }[];
  ratingDistribution: { rating: number; count: number }[];
  topAuthors: { author: string; count: number }[];
  readingYears: { year: number; books: number }[];
  recentActivity: { date: string; books: number }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function AnalyticsPage() {
  const { userProfile, isAuthenticated, isLoading } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      loadAnalyticsData();
    }
  }, [isAuthenticated, userProfile]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await getAnalyticsData();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFunFacts = (data: AnalyticsData) => {
    const avgPagesPerBook = 250; // Estimate
    const totalPages = data.pagesRead || data.totalBooksRead * avgPagesPerBook;
    const pagesPerMile = 1000; // Rough estimate of pages stacked = 1 mile
    const milesRead = Math.round((totalPages / pagesPerMile) * 100) / 100;
    
    const readingTimeHours = Math.round((totalPages / 250) * 6); // ~6 hours per book
    const daysReading = Math.round(readingTimeHours / 24 * 10) / 10;
    
    const coffeeEquivalent = Math.round(data.totalBooksRead * 3.5); // ~3.5 cups per book
    
    return {
      milesRead,
      daysReading: daysReading,
      coffeeEquivalent,
      totalPages,
      readingTimeHours,
      booksPerMonth: data.totalBooksRead > 0 ? Math.round((data.totalBooksRead / 12) * 10) / 10 : 0,
      reviewsPerBook: data.totalBooksRead > 0 ? Math.round((data.totalReviews / data.totalBooksRead) * 100) / 100 : 0
    };
  };

  if (isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in to view your analytics</h1>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Failed to load analytics data</h1>
      </div>
    );
  }

  const funFacts = calculateFunFacts(analyticsData);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 Your Reading Analytics</h1>
        <p className="text-muted-foreground">Discover your reading patterns and achievements</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books Read</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analyticsData.totalBooksRead}</div>
            <p className="text-xs text-muted-foreground">
              {funFacts.booksPerMonth} per month average
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Written</CardTitle>
            <MessageCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{analyticsData.totalReviews}</div>
            <p className="text-xs text-muted-foreground">
              {funFacts.reviewsPerBook} per book ratio
            </p>
          </CardContent>
        </Card>

        <Card className="border-pink-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Likes Received</CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-500">{analyticsData.totalLikes}</div>
            <p className="text-xs text-muted-foreground">
              Community appreciation
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {analyticsData.averageRating.toFixed(1)}★
            </div>
            <p className="text-xs text-muted-foreground">
              Your rating tendency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fun Facts Section */}
      <Card className="mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Fun Reading Facts
          </CardTitle>
          <CardDescription>Some interesting calculations about your reading journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-primary mb-1">{funFacts.milesRead}</div>
              <div className="text-sm text-muted-foreground">Miles of pages read! 📏</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-orange-500 mb-1">{funFacts.daysReading}</div>
              <div className="text-sm text-muted-foreground">Days spent reading ⏰</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-amber-500 mb-1">{funFacts.coffeeEquivalent}</div>
              <div className="text-sm text-muted-foreground">Cups of coffee equivalent ☕</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-green-500 mb-1">{funFacts.totalPages.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total pages conquered 📖</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-blue-500 mb-1">{analyticsData.readingStreak}</div>
              <div className="text-sm text-muted-foreground">Day reading streak 🔥</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-purple-500 mb-1">{analyticsData.totalLists}</div>
              <div className="text-sm text-muted-foreground">Lists created 📝</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="genres" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="genres">Genres</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="authors">Authors</TabsTrigger>
        </TabsList>

        <TabsContent value="genres" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Genre Distribution</CardTitle>
                <CardDescription>Your reading preferences by genre</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.genreDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ genre, percent }) => `${genre} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        innerRadius={30}
                        fill="#8884d8"
                        dataKey="count"
                        paddingAngle={2}
                      >
                        {analyticsData.genreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`${value} books`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Genre Breakdown</CardTitle>
                <CardDescription>Detailed view of your genre preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.genreDistribution} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="genre" type="category" width={80} />
                      <Tooltip formatter={(value) => [`${value} books`, 'Count']} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Reading Activity</CardTitle>
                <CardDescription>Books read and reviews written over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.monthlyReading}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="books" 
                        stackId="1" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.7}
                        name="Books Read"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="reviews" 
                        stackId="1" 
                        stroke="hsl(var(--secondary))" 
                        fill="hsl(var(--secondary))" 
                        fillOpacity={0.7}
                        name="Reviews Written"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reading Trend</CardTitle>
                <CardDescription>Your reading progress over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.monthlyReading}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="books" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                        name="Books Read"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="reviews" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b' }}
                        activeDot={{ r: 6, fill: '#f59e0b' }}
                        name="Reviews Written"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>How you rate the books you read</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.ratingDistribution}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value} books`, 'Count']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Insights</CardTitle>
                <CardDescription>Your rating patterns and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {analyticsData.averageRating.toFixed(1)}⭐
                    </div>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                  </div>
                  
                  <div className="space-y-3">
                    {analyticsData.ratingDistribution.map((rating) => {
                      const total = analyticsData.ratingDistribution.reduce((sum, r) => sum + r.count, 0);
                      const percentage = total > 0 ? (rating.count / total) * 100 : 0;
                      return (
                        <div key={rating.rating} className="flex items-center gap-3">
                          <span className="w-8 text-sm font-medium">{rating.rating}⭐</span>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-sm text-muted-foreground text-right">
                            {rating.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="authors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Authors</CardTitle>
              <CardDescription>Authors you've read the most</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topAuthors.slice(0, 10).map((author, index) => (
                  <div key={author.author} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium">{author.author}</span>
                    </div>
                    <Badge variant="secondary">{author.count} books</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievement Badges */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Reading Achievements
          </CardTitle>
          <CardDescription>Milestones you've unlocked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.totalBooksRead >= 10 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Award className="h-6 w-6 text-yellow-500" />
                <div>
                  <div className="font-semibold">Bookworm</div>
                  <div className="text-sm text-muted-foreground">Read 10+ books</div>
                </div>
              </div>
            )}
            {analyticsData.totalReviews >= 25 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <MessageCircle className="h-6 w-6 text-blue-500" />
                <div>
                  <div className="font-semibold">Critic</div>
                  <div className="text-sm text-muted-foreground">Written 25+ reviews</div>
                </div>
              </div>
            )}
            {analyticsData.readingStreak >= 7 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Flame className="h-6 w-6 text-orange-500" />
                <div>
                  <div className="font-semibold">Streak Master</div>
                  <div className="text-sm text-muted-foreground">7+ day reading streak</div>
                </div>
              </div>
            )}
            {analyticsData.totalLikes >= 50 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <Heart className="h-6 w-6 text-pink-500" />
                <div>
                  <div className="font-semibold">Community Favorite</div>
                  <div className="text-sm text-muted-foreground">50+ likes received</div>
                </div>
              </div>
            )}
            {analyticsData.genreDistribution.length >= 5 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Target className="h-6 w-6 text-purple-500" />
                <div>
                  <div className="font-semibold">Genre Explorer</div>
                  <div className="text-sm text-muted-foreground">Read 5+ different genres</div>
                </div>
              </div>
            )}
            {analyticsData.totalBooksRead >= 50 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <BookOpen className="h-6 w-6 text-green-500" />
                <div>
                  <div className="font-semibold">Library Master</div>
                  <div className="text-sm text-muted-foreground">Read 50+ books</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}