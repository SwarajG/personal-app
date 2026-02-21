import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { storageService } from '../services/storageService.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

const PICKER_API = 'https://photospicker.googleapis.com/v1';

/**
 * Fetch fresh access token from DB and check if it's valid
 */
async function getAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleTokenExpiry: true },
  });

  if (!user?.googleAccessToken) return null;
  if (user.googleTokenExpiry && user.googleTokenExpiry < new Date()) return null;

  return user.googleAccessToken;
}

/**
 * GET /api/google-photos/connection-status
 * Returns whether the user has a valid Google token
 */
router.get('/connection-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const token = await getAccessToken(userId);
    res.json({ connected: !!token });
  } catch (error) {
    console.error('Error checking Google Photos connection:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

/**
 * POST /api/google-photos/picker/session
 * Creates a new Google Photos Picker session
 * Returns { sessionId, pickerUri }
 */
router.post('/picker/session', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const token = await getAccessToken(userId);

    if (!token) {
      return res.status(401).json({ error: 'token_expired', message: 'Please reconnect Google Photos' });
    }

    const response = await fetch(`${PICKER_API}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Picker session create error:', errText);
      return res.status(response.status).json({ error: 'Failed to create picker session' });
    }

    const session = await response.json();
    res.json({ sessionId: session.id, pickerUri: session.pickerUri });
  } catch (error) {
    console.error('Error creating picker session:', error);
    res.status(500).json({ error: 'Failed to create picker session' });
  }
});

/**
 * GET /api/google-photos/picker/session/:sessionId
 * Polls the picker session status.
 * Returns { done: false } or { done: true, mediaItems: [...] }
 */
router.get('/picker/session/:sessionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const token = await getAccessToken(userId);

    if (!token) {
      return res.status(401).json({ error: 'token_expired', message: 'Please reconnect Google Photos' });
    }

    const { sessionId } = req.params;

    const sessionResponse = await fetch(`${PICKER_API}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!sessionResponse.ok) {
      const errText = await sessionResponse.text();
      console.error('Picker session poll error:', errText);
      return res.status(sessionResponse.status).json({ error: 'Failed to poll picker session' });
    }

    const session = await sessionResponse.json();

    if (!session.mediaItemsSet) {
      return res.json({ done: false });
    }

    // Fetch media items via top-level /v1/mediaItems?sessionId=... endpoint
    const itemsResponse = await fetch(`${PICKER_API}/mediaItems?sessionId=${sessionId}&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!itemsResponse.ok) {
      const errText = await itemsResponse.text();
      console.error('Picker media items error:', errText);
      return res.status(itemsResponse.status).json({ error: 'Failed to fetch selected photos' });
    }

    const itemsData = await itemsResponse.json();
    res.json({ done: true, mediaItems: itemsData.mediaItems || [] });
  } catch (error) {
    console.error('Error polling picker session:', error);
    res.status(500).json({ error: 'Failed to poll picker session' });
  }
});

/**
 * POST /api/google-photos/import
 * Download selected photos from Google Photos and upload to S3
 * Body: { mediaItems: Array<{ mediaFile: { baseUrl, mimeType, filename } }> }
 */
router.post('/import', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const token = await getAccessToken(userId);

    if (!token) {
      return res.status(401).json({ error: 'token_expired', message: 'Please reconnect Google Photos' });
    }

    const { mediaItems } = req.body;

    if (!Array.isArray(mediaItems) || mediaItems.length === 0) {
      return res.status(400).json({ error: 'mediaItems must be a non-empty array' });
    }

    if (mediaItems.length > 10) {
      return res.status(400).json({ error: 'Cannot import more than 10 photos at once' });
    }

    const uploadedMedia = await Promise.all(
      mediaItems.map(async (item: any) => {
        const mediaFile = item.mediaFile;
        const downloadUrl = `${mediaFile.baseUrl}=d`;

        const downloadResponse = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download photo: ${mediaFile.filename} (HTTP ${downloadResponse.status})`);
        }

        const buffer = Buffer.from(await downloadResponse.arrayBuffer());
        const { fileKey, fileSize } = await storageService.uploadBuffer(
          buffer,
          mediaFile.filename,
          mediaFile.mimeType,
          userId
        );

        return {
          fileKey,
          fileName: mediaFile.filename,
          fileType: mediaFile.mimeType,
          fileSize,
          fileUrl: storageService.getPublicUrl(fileKey),
        };
      })
    );

    res.json({ uploadedMedia });
  } catch (error) {
    console.error('Error importing Google Photos:', error);
    res.status(500).json({ error: 'Failed to import photos' });
  }
});

export default router;
