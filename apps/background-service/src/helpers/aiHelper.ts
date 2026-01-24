import { GoogleGenAI } from '@google/genai';

/**
 * Generates content using Google Gemini Flash model
 * @param prompt - The text prompt to send to Gemini
 * @returns The generated text response from Gemini
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env file');
    }

    // Initialize the Gemini API with API key
    const genAI = new GoogleGenAI(apiKey);

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    throw error;
  }
}

/**
 * Generates a monthly summary based on all posts from a month
 * @param posts - Array of posts from the month
 * @param month - Month number (1-12)
 * @param year - Year
 * @returns A comprehensive monthly summary
 */
export async function generateMonthlySummary(
  posts: Array<{ title: string; content: string; date: string }>,
  month: number,
  year: number
): Promise<string> {
  try {
    if (posts.length === 0) {
      return 'No posts found for this month.';
    }

    // Combine all post content
    const combinedContent = posts
      .map((post, index) => {
        const plainContent = post.content.replace(/<[^>]*>/g, '').trim();
        const date = new Date(post.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        return `[${date}] ${post.title}\n${plainContent}`;
      })
      .join('\n\n---\n\n');

    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
    });

    const prompt = `You are analyzing a personal diary for ${monthName} ${year}. Below are all the diary entries for this month. Generate a comprehensive monthly summary that includes:

1. Key themes and topics that appeared throughout the month
2. Notable events or experiences
3. Emotional patterns and overall mood
4. Personal growth or insights
5. Any recurring challenges or accomplishments

Keep the summary concise but meaningful (around 200-300 words).

Diary Entries:
${combinedContent}

Provide the monthly summary:`;

    const summary = await generateWithGemini(prompt);
    return summary.trim();
  } catch (error) {
    console.error('Error generating monthly summary:', error);
    throw error;
  }
}
