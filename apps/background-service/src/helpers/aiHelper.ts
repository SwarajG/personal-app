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
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    throw error;
  }
}

