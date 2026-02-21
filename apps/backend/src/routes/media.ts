import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import { storageService } from '../services/storageService.js';
import { isS3Configured, s3Config } from '../config/s3.js';

const router = Router();

/**
 * POST /api/media/presigned-url
 * Generate presigned URL for file upload
 */
router.post('/presigned-url', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { fileName, fileType, fileSize } = req.body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({ 
        error: 'Missing required fields: fileName, fileType, fileSize' 
      });
    }

    // Check if S3 is configured
    if (!isS3Configured()) {
      return res.status(503).json({ 
        error: 'File upload service is not configured' 
      });
    }

    // Generate presigned URL
    const result = await storageService.generatePresignedUploadUrl({
      userId,
      fileName,
      fileType,
      fileSize,
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

/**
 * POST /api/media/presigned-urls/batch
 * Generate multiple presigned URLs for batch upload
 */
router.post('/presigned-urls/batch', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { files } = req.body;

    // Validate required fields
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ 
        error: 'Files array is required and must not be empty' 
      });
    }

    // Check if S3 is configured
    if (!isS3Configured()) {
      return res.status(503).json({ 
        error: 'File upload service is not configured' 
      });
    }

    // Limit batch size
    if (files.length > 10) {
      return res.status(400).json({ 
        error: 'Maximum 10 files can be uploaded at once' 
      });
    }

    // Generate presigned URLs for all files
    const results = await Promise.all(
      files.map((file) =>
        storageService.generatePresignedUploadUrl({
          userId,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
        })
      )
    );

    res.json({ urls: results });
  } catch (error) {
    console.error('Error generating presigned URLs:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to generate presigned URLs' });
  }
});

/**
 * GET /api/media/config
 * Get media upload configuration (allowed types, max size, etc.)
 */
router.get('/config', isAuthenticated, (_req: Request, res: Response) => {
  try {
    res.json({
      maxFileSize: s3Config.maxFileSize,
      allowedMimeTypes: s3Config.allowedMimeTypes,
      isConfigured: isS3Configured(),
    });
  } catch (error) {
    console.error('Error fetching media config:', error);
    res.status(500).json({ error: 'Failed to fetch media configuration' });
  }
});

export default router;
