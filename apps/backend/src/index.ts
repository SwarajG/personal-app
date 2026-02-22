import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import { prisma } from './lib/prisma.js';
import { generatePostTitle } from './helpers/aiHelper.js';
import { triggerMonthlyDigest } from './helpers/queueHelper.js';
import { isAuthenticated } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import mediaRouter from './routes/media.js';
import googlePhotosRouter from './routes/googlePhotos.js';
import profileRouter from './routes/profile.js';
import { redisClient, connectRedis } from './config/redis.js';
import { storageService } from './services/storageService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Session configuration with Redis store
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.use('/api/auth', authRouter);

// Media routes
app.use('/api/media', mediaRouter);

// Google Photos routes
app.use('/api/google-photos', googlePhotosRouter);

// Profile routes
app.use('/api/profile', profileRouter);

// Middleware for service-to-service authentication
const isInternalService = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
  
  next();
};

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Personal Diary Backend API' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all posts (with optional month/year filtering)
app.get('/api/posts', (req: Request, res: Response, next: NextFunction) => {
  // Check if it's an internal service call
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return isInternalService(req, res, next);
  }
  // Otherwise require user authentication
  return isAuthenticated(req, res, next);
}, async (req: Request, res: Response) => {
  try {
    const { month, year, userId } = req.query;
    
    // For internal service calls, userId comes from query params
    // For user calls, userId comes from session
    const actualUserId = userId as string || (req.user as any)?.id;
    
    if (!actualUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    let dateFilter = {};
    
    // If month and year are provided, filter by that month
    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59, 999);
      
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }
    
    const posts = await prisma.post.findMany({
      where: { 
        userId: actualUserId,
        ...dateFilter,
      },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });
    
    // Add fileUrl to media at runtime
    const postsWithUrls = posts.map(post => ({
      ...post,
      media: post.media.map(m => ({
        ...m,
        fileUrl: storageService.getPublicUrl(m.fileKey),
      })),
    }));
    
    res.json(postsWithUrls);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get posts by date
app.get('/api/posts/date/:date', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const userId = (req.user as any).id;
    const targetDate = new Date(date);
    
    // Set to start and end of day for the query
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const posts = await prisma.post.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Add fileUrl to media at runtime
    const postsWithUrls = posts.map(post => ({
      ...post,
      media: post.media.map((m) => ({
        ...m
      })),
    }));
    
    res.json(postsWithUrls);
  } catch (error) {
    console.error('Error fetching posts by date:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get posts by month and year
app.get('/api/posts/month/:year/:month', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const userId = (req.user as any).id;
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    const posts = await prisma.post.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { date: 'asc' },
    });
    
    // Add fileUrl to media at runtime
    const postsWithUrls = posts.map(post => ({
      ...post,
      media: post.media.map(m => ({
        ...m,
        fileUrl: storageService.getPublicUrl(m.fileKey),
      })),
    }));
    
    res.json(postsWithUrls);
  } catch (error) {
    console.error('Error fetching posts by month:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get paginated posts (for All Posts infinite scroll)
app.get('/api/posts/paginated', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { userId },
        include: {
          media: { orderBy: { order: 'asc' } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where: { userId } }),
    ]);

    const postsWithUrls = posts.map(post => ({
      ...post,
      media: post.media.map(m => ({
        ...m,
        fileUrl: storageService.getPublicUrl(m.fileKey),
      })),
    }));

    res.json({
      posts: postsWithUrls,
      total,
      page,
      limit,
      hasMore: skip + posts.length < total,
    });
  } catch (error) {
    console.error('Error fetching paginated posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
app.get('/api/posts/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
      },
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Ensure user owns this post
    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add fileUrl to media at runtime
    const postWithUrls = {
      ...post,
      media: post.media.map(m => ({
        ...m,
        fileUrl: storageService.getPublicUrl(m.fileKey),
      })),
    };
    
    res.json(postWithUrls);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Generate title for post content using AI
app.post('/api/ai/generate-title', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }

    const title = await generatePostTitle(content);
    res.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    res.status(500).json({ error: 'Failed to generate title' });
  }
});

// Create a new post
app.post('/api/posts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { title, content, date, mood, tags, media } = req.body;
    const userId = (req.user as any).id;
    
    const post = await prisma.post.create({
      data: {
        title,
        content,
        date: new Date(date),
        mood,
        tags: tags || [],
        userId,
        media: media && media.length > 0 ? {
          create: media.map((m: any, index: number) => ({
            fileKey: m.fileKey,
            fileName: m.fileName,
            fileType: m.fileType,
            fileSize: m.fileSize,
            order: index,
          })),
        } : undefined,
      },
      include: {
        media: true,
      },
    });
    
    // Add fileUrl to media at runtime
    const postWithUrls = {
      ...post,
      media: post.media.map(m => ({
        ...m,
        fileUrl: storageService.getPublicUrl(m.fileKey),
      })),
    };
    
    res.status(201).json(postWithUrls);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update a post
app.put('/api/posts/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, date, mood, tags } = req.body;
    const userId = (req.user as any).id;
    
    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (existingPost.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const post = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
        date: date ? new Date(date) : undefined,
        mood,
        tags,
      },
    });
    
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
app.delete('/api/posts/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    
    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });
    
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (existingPost.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.post.delete({
      where: { id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Save monthly summary
app.post('/api/monthly-summaries', (req: Request, res: Response, next: NextFunction) => {
  // Check if it's an internal service call
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return isInternalService(req, res, next);
  }
  // Otherwise require user authentication
  return isAuthenticated(req, res, next);
}, async (req: Request, res: Response) => {
  try {
    const { month, year, summary, generatedAt, userId: bodyUserId } = req.body;
    
    // For internal service calls, userId comes from request body
    // For user calls, userId comes from session
    const userId = bodyUserId || (req.user as any)?.id;
    
    if (!userId || !month || !year || !summary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const monthlySummary = await prisma.monthlySummary.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      update: {
        summary,
        generatedAt: new Date(generatedAt),
      },
      create: {
        userId,
        month,
        year,
        summary,
        generatedAt: new Date(generatedAt),
      },
    });
    
    res.status(201).json(monthlySummary);
  } catch (error) {
    console.error('Error saving monthly summary:', error);
    res.status(500).json({ error: 'Failed to save monthly summary' });
  }
});

// Get monthly summary
app.get('/api/monthly-summaries/:year/:month', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { year, month } = req.params;
    const userId = (req.user as any).id;
    
    const summary = await prisma.monthlySummary.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });
    
    if (!summary) {
      return res.status(404).json({ error: 'Monthly summary not found' });
    }
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

// Trigger monthly digest generation
app.post('/api/monthly-summaries/trigger', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { month, year } = req.body;
    const userId = (req.user as any).id;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Missing required fields: month, year' });
    }
    
    // Validate month and year
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    
    // Trigger the background job
    await triggerMonthlyDigest(userId, month, year);
    
    res.json({ 
      message: 'Monthly digest job triggered successfully',
      userId,
      month,
      year
    });
  } catch (error) {
    console.error('Error triggering monthly digest:', error);
    res.status(500).json({ error: 'Failed to trigger monthly digest' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

// Search users by email prefix
app.get('/api/users/search', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const userId = (req.user as any).id;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }
    
    const users = await prisma.user.findMany({
      where: {
        email: {
          startsWith: q.toLowerCase(),
          mode: 'insensitive',
        },
        id: {
          not: userId, // Exclude current user
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
      take: 10,
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user's people list
app.get('/api/people', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    
    const people = await prisma.person.findMany({
      where: { userId },
      include: {
        addedUser: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(people);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// Add a person to user's people list
app.post('/api/people', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { addedUserId, alias } = req.body;
    
    if (!addedUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if the user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: addedUserId },
    });
    
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if already added
    const existing = await prisma.person.findUnique({
      where: {
        userId_addedUserId: {
          userId,
          addedUserId,
        },
      },
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Person already in your list' });
    }
    
    // Determine alias
    const finalAlias = alias || userToAdd.name?.split(' ')[0] || userToAdd.email.split('@')[0];
    
    const person = await prisma.person.create({
      data: {
        userId,
        addedUserId,
        alias: finalAlias,
      },
      include: {
        addedUser: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    
    res.status(201).json(person);
  } catch (error) {
    console.error('Error adding person:', error);
    res.status(500).json({ error: 'Failed to add person' });
  }
});

// Remove a person from user's people list
app.delete('/api/people/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    
    const person = await prisma.person.findUnique({
      where: { id },
    });
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    if (person.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await prisma.person.delete({
      where: { id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing person:', error);
    res.status(500).json({ error: 'Failed to remove person' });
  }
});

// Connect to Redis and start server
async function startServer() {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
