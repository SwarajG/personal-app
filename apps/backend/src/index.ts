import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';
import { generatePostTitle } from './helpers/aiHelper.js';
import { triggerMonthlyDigest } from './helpers/queueHelper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Personal Diary Backend API' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all posts
app.get('/api/posts', async (_req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get posts by date
app.get('/api/posts/date/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    
    // Set to start and end of day for the query
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const posts = await prisma.post.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts by date:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
app.get('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id },
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Generate title for post content using AI
app.post('/api/ai/generate-title', async (req: Request, res: Response) => {
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
app.post('/api/posts', async (req: Request, res: Response) => {
  try {
    const { title, content, date, mood, tags } = req.body;
    
    const post = await prisma.post.create({
      data: {
        title,
        content,
        date: new Date(date),
        mood,
        tags: tags || [],
      },
    });
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update a post
app.put('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, date, mood, tags } = req.body;
    
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
app.delete('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
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
app.post('/api/monthly-summaries', async (req: Request, res: Response) => {
  try {
    const { userId, month, year, summary, generatedAt } = req.body;
    
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
app.get('/api/monthly-summaries/:userId/:year/:month', async (req: Request, res: Response) => {
  try {
    const { userId, year, month } = req.params;
    
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
app.post('/api/monthly-summaries/trigger', async (req: Request, res: Response) => {
  try {
    const { userId, month, year } = req.body;
    
    if (!userId || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields: userId, month, year' });
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
app.delete('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.post.delete({
      where: { id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
