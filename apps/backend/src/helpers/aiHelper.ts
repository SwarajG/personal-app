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
 * Generates a title for a diary post based on its content
 * @param content - The post content (can be HTML or plain text)
 * @returns A suggested title for the post
 */
export async function generatePostTitle(content: string): Promise<string> {
  try {
    // Strip HTML tags for cleaner prompt
    const plainContent = content.replace(/<[^>]*>/g, '').trim();
    
    if (!plainContent) {
      throw new Error('Content is empty');
    }

    const prompt = `Based on the following diary post content, create a concise and engaging title (maximum 8 words):\n\n${plainContent}\n\nProvide only the title, nothing else.`;
    
    const title = await generateWithGemini(prompt);
    return title.trim();
  } catch (error) {
    console.error('Error generating post title:', error);
    throw error;
  }
}
