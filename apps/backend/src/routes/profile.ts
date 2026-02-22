import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { isAuthenticated } from '../middleware/auth.js';
import { storageService } from '../services/storageService.js';

const router = express.Router();

// GET /api/profile - get current user's full profile
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        profilePicture: true,
        googleId: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const profilePictureUrl = user.profilePicture
      ? storageService.getPublicUrl(user.profilePicture)
      : null;

    res.json({ user: { ...user, profilePictureUrl } });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile - update name and/or username
router.put('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { name, username } = req.body;
    const userId = (req.user as any).id;

    if (username !== undefined && username !== null && username !== '') {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({
          error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
        });
      }
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name || null }),
        ...(username !== undefined && { username: username || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    const profilePictureUrl = updated.profilePicture
      ? storageService.getPublicUrl(updated.profilePicture)
      : null;

    res.json({ user: { ...updated, profilePictureUrl } });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/profile/picture/upload-url - get presigned URL for profile picture upload
router.get('/picture/upload-url', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { fileType } = req.query;
    const userId = (req.user as any).id;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!fileType || !allowedTypes.includes(fileType as string)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' });
    }

    const ext = (fileType as string).split('/')[1].replace('jpeg', 'jpg');
    const fileKey = `users/${userId}/profile/avatar.${ext}`;

    const uploadUrl = await storageService.generateProfilePicturePresignedUrl(fileKey, fileType as string);

    res.json({ uploadUrl, fileKey });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// PUT /api/profile/picture - save profile picture fileKey after upload
router.put('/picture', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { fileKey } = req.body;
    const userId = (req.user as any).id;

    if (!fileKey) return res.status(400).json({ error: 'fileKey is required' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: fileKey },
      select: { id: true, profilePicture: true },
    });

    res.json({
      profilePicture: updated.profilePicture,
      profilePictureUrl: storageService.getPublicUrl(updated.profilePicture!),
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

// DELETE /api/profile - delete the user's account
router.delete('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;

    await prisma.user.delete({ where: { id: userId } });

    req.logout((err) => {
      if (err) console.error('Logout error after account deletion:', err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid', { path: '/', httpOnly: true });
        res.json({ message: 'Account deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
