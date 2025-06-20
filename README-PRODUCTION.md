# LibroVision - Production-Ready Book Tracking Application

A complete social book tracking platform built with Next.js, Supabase, and TypeScript. Users can discover books, track their reading journey, share reviews, create lists, and follow other readers in a rich social environment.

## 🚀 Features

### Core Functionality
- **Book Discovery**: Search books via Google Books API with intelligent caching
- **Reading Tracking**: Track books as read, want to read, owned, or liked with dates and notes
- **Reviews & Ratings**: Write detailed reviews with 5-star ratings
- **Book Lists**: Create public/private curated book collections
- **Social Features**: Follow users, activity feeds, notifications

### Advanced Features
- **Threaded Comments**: Nested comments on reviews and lists with like system
- **Real-time Notifications**: Get notified of likes, comments, follows, and replies
- **Advanced Search**: Filter books by genre, year, rating with full-text search
- **User Profiles**: Comprehensive profiles showing all user activity
- **Responsive Design**: Beautiful UI that works on all devices

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: Tailwind CSS, Radix UI
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API
- **API Integration**: Google Books API

## 🏗 Project Structure

```
bookapp/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── books/          # Book-related components
│   │   ├── comments/       # Comment system components
│   │   ├── lists/          # List management components
│   │   ├── reviews/        # Review components
│   │   └── ui/             # Base UI components (Radix)
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── services/       # API service functions
│   │   ├── supabaseClient.ts # Supabase configuration
│   │   └── utils.ts        # Utility functions
│   └── types/              # TypeScript type definitions
├── sql/                    # Database schema and setup scripts
└── docs/                   # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Books API key (optional, for enhanced search)

### 1. Clone and Install
```bash
git clone <repository-url>
cd bookapp
npm install
```

### 2. Database Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema**:
   ```sql
   -- In Supabase SQL Editor, run:
   -- 1. First run: sql/schema.sql
   -- 2. Then run: sql/setup-complete.sql
   ```

3. **Configure Row Level Security**: The setup script automatically configures RLS policies for security.

### 3. Environment Configuration

Create `.env.local`:
```bash
# Supabase Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Books API (optional, enhances search)
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
```

### 4. Development
```bash
npm run dev
```
Visit `http://localhost:9002`

## 📋 Detailed Setup Guide

### Supabase Configuration

1. **Create Tables**: Run `sql/schema.sql` in Supabase SQL Editor
2. **Setup Security**: Run `sql/setup-complete.sql` for RLS policies and triggers
3. **Authentication**: Configure email auth in Supabase Auth settings
4. **Storage**: Set up storage bucket for user avatars (optional)

### Google Books API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Enable Books API
4. Create credentials (API Key)
5. Add the key to your `.env.local`

### Key Features Configuration

#### User Authentication
- Email/password signup with automatic profile creation
- Username validation and uniqueness checking
- Session management with Supabase Auth

#### Book Search & Caching
- Primary search via Google Books API
- Automatic caching in local database
- Fallback to cached results for performance
- User interaction data enrichment

#### Social Features
- Follow/unfollow system
- Real-time activity feeds
- Comprehensive notification system
- Like system for reviews, lists, and comments

#### Comment System
- Threaded comments up to multiple levels
- Like/unlike functionality
- Proper deletion handling (preserves thread structure)
- Real-time notifications

## 🗄 Database Schema

### Core Tables
- `user_profiles` - Public user information
- `books` - Book metadata with ratings
- `user_book_interactions` - Reading status, ratings, notes
- `reviews` - User reviews with ratings
- `list_collections` - User-created book lists
- `list_items` - Books within lists
- `comments` - Threaded comments on reviews/lists
- `likes` - Like system for all content
- `follows` - User following relationships
- `notifications` - Activity notifications

### Key Features
- **RLS Security**: All tables protected with Row Level Security
- **Triggers**: Automatic counter updates, notification creation
- **Indexes**: Optimized for performance with full-text search
- **Functions**: Helper functions for complex queries

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**:
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Environment Variables**: Add all `.env.local` variables to Vercel

3. **Custom Domain** (optional): Configure in Vercel dashboard

### Alternative Deployment Options

- **Netlify**: Similar process to Vercel
- **Railway**: Great for full-stack apps
- **DigitalOcean App Platform**: Production-ready hosting

### Production Checklist

- [ ] Supabase project in production mode
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Performance monitoring setup
- [ ] Error tracking configured (Sentry recommended)
- [ ] SEO optimization implemented
- [ ] Analytics setup (Google Analytics, etc.)

## 🔧 API Reference

### Book Service
```typescript
// Search books with caching
searchBooks(query, page, pageSize, filters)

// Get book details with user data
getBookDetails(bookId)

// Update user interaction (read, rating, etc.)
updateUserBookInteraction(bookId, interaction)

// Like/unlike books
likeBook(bookId) / unlikeBook(bookId)
```

### User Service
```typescript
// Get user profile with stats
getUserProfile(username)

// Follow/unfollow users
followUser(userId) / unfollowUser(userId)

// Get activity feed
getHomeFeed(page, pageSize)

// Notifications
getNotifications() / markNotificationsAsRead()
```

### Review & List Services
```typescript
// Reviews with comments
addBookReview(bookId, rating, text)
getReviewComments(reviewId)
addCommentToReview(reviewId, text, parentId?)

// Lists with social features
createList(listData)
addBookToList(listId, bookId)
getListComments(listId)
likeList(listId) / unlikeList(listId)
```

## 🎨 UI Components

Built with modern, accessible components:

- **Radix UI**: Headless components for accessibility
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Beautiful, consistent icons
- **React Hook Form**: Performance-optimized forms
- **Responsive Design**: Mobile-first approach

### Key Components
- `BookCard` - Display book information
- `ReviewCard` - Show reviews with interactions
- `ListCard` - Book list display
- `CommentCard` - Threaded comment display
- `StarRating` - Interactive rating component

## 🔐 Security Features

### Authentication & Authorization
- Supabase Auth with email verification
- Row Level Security (RLS) on all tables
- JWT-based session management
- Secure API endpoints

### Data Protection
- Input validation with Zod schemas
- SQL injection prevention via Supabase
- CSRF protection
- Rate limiting (implement via middleware)

### Privacy Controls
- Public/private lists
- User profile visibility controls
- Content moderation capabilities
- GDPR compliance ready

## 📊 Performance Optimization

### Database
- Optimized indexes for all query patterns
- Connection pooling via Supabase
- Efficient pagination
- Full-text search indexes

### Frontend
- Next.js optimizations (SSR, caching)
- Image optimization
- Code splitting
- Bundle analysis

### Caching Strategy
- Google Books API results cached in database
- User interaction data cached locally
- Static asset caching via CDN
- Database query result caching

## 🧪 Testing

### Test Structure
```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run test:perf   # Performance tests
```

### Test Coverage
- Service function unit tests
- Component integration tests
- Database operation tests
- Authentication flow tests

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**:
- Check Supabase URL and keys
- Verify RLS policies
- Check network connectivity

**Authentication Problems**:
- Verify email confirmation settings
- Check Supabase Auth configuration
- Validate environment variables

**Search Not Working**:
- Verify Google Books API key
- Check rate limits
- Verify database caching setup

### Debug Mode
```bash
# Enable debug logging
DEBUG=supabase:* npm run dev
```

## 📈 Monitoring & Analytics

### Recommended Tools
- **Error Tracking**: Sentry
- **Performance**: Vercel Analytics
- **User Analytics**: Google Analytics 4
- **Database**: Supabase built-in monitoring

### Key Metrics to Track
- User engagement (reviews, lists, follows)
- Search performance and results
- Page load times
- Error rates
- Database query performance

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Conventional commits for commit messages
- Component documentation with Storybook

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check `/docs` folder
- **Issues**: GitHub Issues
- **Community**: Discussions tab
- **Email**: [Your support email]

---

**LibroVision** - Building the future of social reading 📚✨ 