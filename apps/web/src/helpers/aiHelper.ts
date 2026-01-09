import { GoogleGenAI } from '@google/genai'

/**
 * Generates content using Google Gemini Flash model
 * @param prompt - The text prompt to send to Gemini
 * @returns The generated text response from Gemini
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured in .env file. Please add it and restart the dev server.')
    }

    // Initialize the Gemini API with API key
    const genAI = new GoogleGenAI(apiKey)

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    return response.text || '';
  } catch (error) {
    console.error('Error generating content with Gemini:', error)
    throw error
  }
}

/**
 * Generates content with streaming response using Google Gemini Flash model
 * @param prompt - The text prompt to send to Gemini
 * @param onChunk - Callback function that receives each chunk of text as it arrives
 * @returns The complete generated text
 */
export async function generateWithGeminiStream(
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not configured in .env file. Please add it and restart the dev server.')
    }

    // Initialize the Gemini API with API key
    const genAI = new GoogleGenAI(apiKey)

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: { response_type: 'stream' }
    });

    let fullText = ''
    
    if (response.text) {
      fullText = response.text
      if (onChunk) {
        onChunk(fullText)
      }
    }

    return fullText
  } catch (error) {
    console.error('Error generating content with Gemini (streaming):', error)
    throw error
  }
}
