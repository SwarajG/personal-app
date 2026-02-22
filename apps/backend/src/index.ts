import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import passport from './config/passport.js';
import { prisma } from './lib/prisma.js';
import { generatePostTitle } from './helpers/aiHelper.js';
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
  res.json({ message: 'Innerloop Backend API' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper: visibility filter — post is visible to its author or its co-author
const visibilityFilter = (userId: string) => ({
  OR: [{ userId }, { coAuthorId: userId }],
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
        ...visibilityFilter(actualUserId),
        ...dateFilter,
      },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
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
        ...visibilityFilter(userId),
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
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
        ...visibilityFilter(userId),
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        media: {
          orderBy: { order: 'asc' },
        },
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
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
        where: visibilityFilter(userId),
        include: {
          media: { orderBy: { order: 'asc' } },
          coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
          initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
          milestone: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where: visibilityFilter(userId) }),
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
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Allow access to original author or co-author
    if (post.userId !== userId && post.coAuthorId !== userId) {
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
    const { title, content, date, mood, tags, media, coAuthorId } = req.body;
    const userId = (req.user as any).id;

    // If co-author specified, validate they are an accepted connection
    if (coAuthorId) {
      const personRelation = await prisma.person.findUnique({
        where: { userId_addedUserId: { userId, addedUserId: coAuthorId } },
      });
      if (!personRelation || personRelation.status !== 'ACCEPTED') {
        return res.status(400).json({ error: 'Co-author must be an accepted connection in your People list' });
      }
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        date: new Date(date),
        mood,
        tags: tags || [],
        userId,
        initiatedBy: userId,
        isCoPost: !!coAuthorId,
        coAuthorId: coAuthorId || null,
        coAuthorAccepted: false,
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
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
      },
    });

    // If co-post, notify the co-author
    if (coAuthorId) {
      const initiator = req.user as any;
      await prisma.notification.create({
        data: {
          userId: coAuthorId,
          type: 'CO_POST_RECEIVED',
          message: `${initiator.name || initiator.email} shared a memory with you`,
          postId: post.id,
        },
      });
    }

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

// Co-author accepts a co-post
app.patch('/api/posts/:id/accept', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.coAuthorId !== userId) return res.status(403).json({ error: 'Only the co-author can accept' });
    if (post.coAuthorAccepted) return res.status(400).json({ error: 'Already accepted' });

    await prisma.post.update({ where: { id }, data: { coAuthorAccepted: true } });

    const user = req.user as any;
    await prisma.notification.create({
      data: {
        userId: post.userId,
        type: 'CO_POST_ACCEPTED',
        message: `${user.name || user.email} accepted your shared memory`,
        postId: id,
      },
    });

    res.json({ message: 'Co-post accepted' });
  } catch (error) {
    console.error('Error accepting co-post:', error);
    res.status(500).json({ error: 'Failed to accept co-post' });
  }
});

// Co-author declines a co-post (converts back to personal post for author)
app.patch('/api/posts/:id/decline', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.coAuthorId !== userId) return res.status(403).json({ error: 'Only the co-author can decline' });

    await prisma.post.update({
      where: { id },
      data: { isCoPost: false, coAuthorId: null, coAuthorAccepted: false },
    });

    const user = req.user as any;
    await prisma.notification.create({
      data: {
        userId: post.userId,
        type: 'CO_POST_DECLINED',
        message: `${user.name || user.email} declined the shared memory`,
        postId: id,
      },
    });

    res.json({ message: 'Co-post declined' });
  } catch (error) {
    console.error('Error declining co-post:', error);
    res.status(500).json({ error: 'Failed to decline co-post' });
  }
});

// Co-author contributes to an accepted co-post
app.patch('/api/posts/:id/contribute', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const { note, media } = req.body;

    const post = await prisma.post.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.coAuthorId !== userId) return res.status(403).json({ error: 'Only the co-author can contribute' });
    if (!post.coAuthorAccepted) return res.status(400).json({ error: 'Must accept the co-post before contributing' });

    const maxOrder = post.media.reduce((m: number, item: any) => Math.max(m, item.order), -1);

    const personRecord = await prisma.person.findUnique({
      where: { userId_addedUserId: { userId: post.userId, addedUserId: userId } },
      select: { alias: true },
    });
    const authorLabel = personRecord?.alias || (req.user as any).name || (req.user as any).email;

    const updateData: any = {};
    if (note) {
      updateData.content = post.content + `<hr/><p><em>Added by ${authorLabel}:</em></p>` + note;
    }

    await prisma.$transaction([
      prisma.post.update({ where: { id }, data: updateData }),
      ...(media && media.length > 0
        ? [prisma.media.createMany({
            data: media.map((m: any, i: number) => ({
              postId: id,
              fileKey: m.fileKey,
              fileName: m.fileName,
              fileType: m.fileType,
              fileSize: m.fileSize,
              order: maxOrder + 1 + i,
              contributedBy: userId,
            })),
          })]
        : []),
    ]);

    const user = req.user as any;
    await prisma.notification.create({
      data: {
        userId: post.userId,
        type: 'CO_POST_CONTRIBUTED',
        message: `${user.name || user.email} added to your shared memory`,
        postId: id,
      },
    });

    const updated = await prisma.post.findUnique({
      where: { id },
      include: {
        media: { orderBy: { order: 'asc' } },
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
      },
    });

    res.json({
      ...updated,
      media: updated!.media.map(m => ({ ...m, fileUrl: storageService.getPublicUrl(m.fileKey) })),
    });
  } catch (error) {
    console.error('Error contributing to co-post:', error);
    res.status(500).json({ error: 'Failed to contribute to co-post' });
  }
});

// Co-author removes their contribution from a co-post
app.delete('/api/posts/:id/contribution', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const post = await prisma.post.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.coAuthorId !== userId) return res.status(403).json({ error: 'Only the co-author can remove their contribution' });

    // Strip the appended note — everything from the first <hr/> onwards
    const hrIndex = post.content.indexOf('<hr/>');
    const strippedContent = hrIndex !== -1 ? post.content.substring(0, hrIndex) : post.content;

    // Collect contributed media for storage cleanup
    const contributedMedia = (post.media as any[]).filter((m) => m.contributedBy === userId);

    await prisma.$transaction([
      prisma.post.update({ where: { id }, data: { content: strippedContent } }),
      ...(contributedMedia.length > 0
        ? [prisma.media.deleteMany({ where: { postId: id, contributedBy: userId } })]
        : []),
    ]);

    if (contributedMedia.length > 0) {
      await storageService.deleteFiles(contributedMedia.map((m) => m.fileKey));
    }

    const updated = await prisma.post.findUnique({
      where: { id },
      include: {
        media: { orderBy: { order: 'asc' } },
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
      },
    });

    res.json({
      ...updated,
      media: updated!.media.map((m: any) => ({ ...m, fileUrl: storageService.getPublicUrl(m.fileKey) })),
    });
  } catch (error) {
    console.error('Error removing contribution:', error);
    res.status(500).json({ error: 'Failed to remove contribution' });
  }
});

// Get all co-posts for the current user (both created and received)
app.get('/api/co-posts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const coPosts = await prisma.post.findMany({
      where: {
        isCoPost: true,
        OR: [{ userId }, { coAuthorId: userId }],
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        coAuthor: { select: { id: true, name: true, email: true, avatar: true, profilePicture: true } },
        initiatedByUser: { select: { id: true, name: true, email: true, avatar: true } },
        milestone: true,
      },
      orderBy: [{ coAuthorAccepted: 'asc' }, { createdAt: 'desc' }],
    });

    const withUrls = coPosts.map(post => ({
      ...post,
      media: post.media.map(m => ({ ...m, fileUrl: storageService.getPublicUrl(m.fileKey) })),
    }));

    res.json(withUrls);
  } catch (error) {
    console.error('Error fetching co-posts:', error);
    res.status(500).json({ error: 'Failed to fetch co-posts' });
  }
});

// Get notifications for current user
app.get('/api/notifications', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all notifications as read
app.patch('/api/notifications/read-all', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Mark a single notification as read
app.patch('/api/notifications/:id/read', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== userId) return res.status(403).json({ error: 'Access denied' });

    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
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

const PERSON_INCLUDE = {
  addedUser: { select: { id: true, email: true, name: true, avatar: true } },
  user: { select: { id: true, email: true, name: true, avatar: true } },
} as const;

// Get user's people list (accepted, pendingSent, pendingReceived)
app.get('/api/people', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const [accepted, pendingSent, pendingReceived] = await Promise.all([
      prisma.person.findMany({
        where: { userId, status: 'ACCEPTED' },
        include: PERSON_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.person.findMany({
        where: { userId, status: 'PENDING' },
        include: PERSON_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.person.findMany({
        where: { addedUserId: userId, status: 'PENDING' },
        include: PERSON_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ accepted, pendingSent, pendingReceived });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// Send a person request
app.post('/api/people', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { addedUserId, alias, relationship } = req.body;

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

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    // Check if a request already exists in either direction
    const existing = await prisma.person.findFirst({
      where: {
        OR: [
          { userId, addedUserId },
          { userId: addedUserId, addedUserId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'Already connected with this person' });
      }
      if (existing.status === 'PENDING') {
        return res.status(400).json({ error: 'A request is already pending' });
      }
      // DECLINED — allow re-sending by deleting the old record
      await prisma.person.delete({ where: { id: existing.id } });
    }

    // Determine alias
    const finalAlias = alias?.trim() || userToAdd.name?.split(' ')[0] || userToAdd.email.split('@')[0];

    const person = await prisma.person.create({
      data: {
        userId,
        addedUserId,
        alias: finalAlias,
        relationship: relationship?.trim() || null,
        status: 'PENDING',
      },
      include: PERSON_INCLUDE,
    });

    // Notify the recipient
    const senderName = currentUser?.name || currentUser?.email || 'Someone';
    const relationLabel = relationship ? ` as your ${relationship}` : '';
    await prisma.notification.create({
      data: {
        userId: addedUserId,
        type: 'PERSON_REQUEST_RECEIVED',
        message: `${senderName} sent you a connection request${relationLabel}.`,
        personId: person.id,
      },
    });

    res.status(201).json(person);
  } catch (error) {
    console.error('Error sending person request:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Accept a person request
app.patch('/api/people/:id/accept', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const request = await prisma.person.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.addedUserId !== userId) return res.status(403).json({ error: 'Access denied' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    // Accept and create the reverse connection
    const [updated] = await prisma.$transaction([
      prisma.person.update({
        where: { id },
        data: { status: 'ACCEPTED' },
        include: PERSON_INCLUDE,
      }),
      prisma.person.upsert({
        where: { userId_addedUserId: { userId, addedUserId: request.userId } },
        update: { status: 'ACCEPTED' },
        create: {
          userId,
          addedUserId: request.userId,
          alias: request.user.name?.split(' ')[0] || request.user.email.split('@')[0],
          relationship: request.relationship,
          status: 'ACCEPTED',
        },
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          type: 'PERSON_REQUEST_ACCEPTED',
          message: `${currentUser?.name || currentUser?.email || 'Someone'} accepted your connection request.`,
          personId: id,
        },
      }),
    ]);

    res.json(updated);
  } catch (error) {
    console.error('Error accepting person request:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Decline a person request
app.patch('/api/people/:id/decline', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const request = await prisma.person.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.addedUserId !== userId) return res.status(403).json({ error: 'Access denied' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request is not pending' });

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction([
      prisma.person.update({ where: { id }, data: { status: 'DECLINED' } }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          type: 'PERSON_REQUEST_DECLINED',
          message: `${currentUser?.name || currentUser?.email || 'Someone'} declined your connection request.`,
          personId: id,
        },
      }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Error declining person request:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

// Remove a person (disconnect)
app.delete('/api/people/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const person = await prisma.person.findUnique({ where: { id } });

    if (!person) return res.status(404).json({ error: 'Person not found' });

    // Only the requester can delete their own record (or cancel a pending request)
    if (person.userId !== userId) return res.status(403).json({ error: 'Access denied' });

    if (person.status === 'ACCEPTED') {
      // Remove both sides of an accepted connection
      await prisma.person.deleteMany({
        where: {
          OR: [
            { userId, addedUserId: person.addedUserId },
            { userId: person.addedUserId, addedUserId: userId },
          ],
        },
      });
    } else {
      await prisma.person.delete({ where: { id } });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error removing person:', error);
    res.status(500).json({ error: 'Failed to remove person' });
  }
});

// ── Milestone endpoints ────────────────────────────────────────────────────────

// Add or update a milestone on a post
app.post('/api/posts/:id/milestone', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const { label, personId, presetUsed } = req.body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return res.status(400).json({ error: 'Milestone label is required' });
    }
    if (label.trim().length > 60) {
      return res.status(400).json({ error: 'Milestone label must be 60 characters or fewer' });
    }

    // Post must belong to the current user (only author can tag milestones)
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId !== userId) return res.status(403).json({ error: 'Only the post author can tag milestones' });

    // For co-posts, auto-resolve personId from the relationship
    let resolvedPersonId = personId ?? null;
    if (post.isCoPost && post.coAuthorId && !resolvedPersonId) {
      const person = await prisma.person.findUnique({
        where: { userId_addedUserId: { userId, addedUserId: post.coAuthorId } },
      });
      resolvedPersonId = person?.id ?? null;
    }

    // If personId provided, verify current user is part of that relationship
    if (resolvedPersonId) {
      const person = await prisma.person.findUnique({ where: { id: resolvedPersonId } });
      if (!person || (person.userId !== userId && person.addedUserId !== userId)) {
        return res.status(403).json({ error: 'Invalid relationship' });
      }
    }

    const milestone = await prisma.milestone.upsert({
      where: { postId: id },
      create: { postId: id, label: label.trim(), personId: resolvedPersonId, presetUsed: presetUsed ?? null, createdBy: userId },
      update: { label: label.trim(), personId: resolvedPersonId, presetUsed: presetUsed ?? null },
    });

    res.json(milestone);
  } catch (error) {
    console.error('Error saving milestone:', error);
    res.status(500).json({ error: 'Failed to save milestone' });
  }
});

// Remove a milestone from a post
app.delete('/api/posts/:id/milestone', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId !== userId) return res.status(403).json({ error: 'Only the post author can remove milestones' });

    await prisma.milestone.deleteMany({ where: { postId: id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error removing milestone:', error);
    res.status(500).json({ error: 'Failed to remove milestone' });
  }
});

// Get all milestones for a relationship (visible to both users in the connection)
app.get('/api/relationships/:id/milestones', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const person = await prisma.person.findUnique({ where: { id } });
    if (!person) return res.status(404).json({ error: 'Relationship not found' });
    if (person.userId !== userId && person.addedUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find the reverse Person record too so both sides' milestones surface
    const reverse = await prisma.person.findUnique({
      where: { userId_addedUserId: { userId: person.addedUserId, addedUserId: person.userId } },
    });

    const personIds = [id, ...(reverse ? [reverse.id] : [])];

    const milestones = await prisma.milestone.findMany({
      where: { personId: { in: personIds } },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            date: true,
            media: { orderBy: { order: 'asc' }, take: 1, select: { fileKey: true, fileType: true } },
          },
        },
      },
      orderBy: { post: { date: 'asc' } },
    });

    const withUrls = milestones.map(m => ({
      ...m,
      post: m.post ? {
        ...m.post,
        media: m.post.media.map(med => ({ ...med, fileUrl: storageService.getPublicUrl(med.fileKey) })),
      } : null,
    }));

    res.json(withUrls);
  } catch (error) {
    console.error('Error fetching relationship milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Get all milestones for the current user
app.get('/api/users/me/milestones', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    const milestones = await prisma.milestone.findMany({
      where: { createdBy: userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            date: true,
            media: { orderBy: { order: 'asc' }, take: 1, select: { fileKey: true, fileType: true } },
          },
        },
        person: { select: { id: true, alias: true, relationship: true } },
      },
      orderBy: { post: { date: 'desc' } },
    });

    const withUrls = milestones.map(m => ({
      ...m,
      post: m.post ? {
        ...m.post,
        media: m.post.media.map(med => ({ ...med, fileUrl: storageService.getPublicUrl(med.fileKey) })),
      } : null,
    }));

    res.json(withUrls);
  } catch (error) {
    console.error('Error fetching user milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
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
