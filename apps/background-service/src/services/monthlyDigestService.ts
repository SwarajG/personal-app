import axios from 'axios';
import { generateMonthlySummary } from '../helpers/aiHelper.js';

interface Post {
  id: string;
  title: string;
  content: string;
  date: string;
  mood?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all posts for a specific month and user
 */
async function fetchPostsForMonth(
  userId: string,
  month: number,
  year: number
): Promise<Post[]> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:4000';
    
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    
    const response = await axios.get<Post[]>(`${backendUrl}/api/posts`, {
      params: {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

/**
 * Send the monthly summary to the backend
 */
async function sendMonthlySummaryToBackend(
  userId: string,
  month: number,
  year: number,
  summary: string
): Promise<void> {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:4000';
    
    await axios.post(`${backendUrl}/api/monthly-summaries`, {
      userId,
      month,
      year,
      summary,
      generatedAt: new Date().toISOString(),
    });
    
    console.log(`Successfully sent monthly summary for ${month}/${year} to backend`);
  } catch (error) {
    console.error('Error sending summary to backend:', error);
    throw error;
  }
}

/**
 * Process a monthly digest job
 */
export async function processMonthlyDigest(
  userId: string,
  month: number,
  year: number
): Promise<void> {
  try {
    console.log(`Processing monthly digest for user ${userId}, ${month}/${year}`);
    
    // 1. Fetch all posts for the month
    const posts = await fetchPostsForMonth(userId, month, year);
    console.log(`Fetched ${posts.length} posts`);
    
    if (posts.length === 0) {
      console.log('No posts found, skipping summary generation');
      return;
    }
    
    // 2. Generate monthly summary using AI
    console.log('Generating monthly summary with AI...');
    const summary = await generateMonthlySummary(posts, month, year);
    console.log('Summary generated successfully');
    
    // 3. Send summary to backend
    await sendMonthlySummaryToBackend(userId, month, year, summary);
    
    console.log(`Monthly digest completed for user ${userId}, ${month}/${year}`);
  } catch (error) {
    console.error('Error processing monthly digest:', error);
    throw error;
  }
}
