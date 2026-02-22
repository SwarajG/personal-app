import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3Config, isS3Configured } from '../config/s3.js';

export interface PresignedUrlRequest {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export class StorageService {
  /**
   * Generate a presigned URL for uploading a file to S3
   */
  async generatePresignedUploadUrl(
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> {
    if (!isS3Configured()) {
      throw new Error('S3 is not properly configured. Please check your environment variables.');
    }

    // Validate file type
    const allowedTypes = [
      ...s3Config.allowedMimeTypes.images,
      ...s3Config.allowedMimeTypes.videos,
    ];

    if (!allowedTypes.includes(request.fileType)) {
      throw new Error(`File type ${request.fileType} is not allowed`);
    }

    // Validate file size
    if (request.fileSize > s3Config.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${s3Config.maxFileSize} bytes`
      );
    }

    // Generate unique file key with user folder structure
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(request.fileName);
    const fileKey = `users/${request.userId}/posts/${timestamp}-${sanitizedFileName}`;

    // Create S3 PutObject command
    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: fileKey,
      ContentType: request.fileType,
    });

    // Generate presigned URL
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: s3Config.presignedUrlExpiration,
    });

    return {
      uploadUrl,
      fileKey,
      expiresIn: s3Config.presignedUrlExpiration,
    };
  }

  /**
   * Upload a buffer directly to S3 (used for server-side imports, e.g. Google Photos)
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    fileType: string,
    userId: string
  ): Promise<{ fileKey: string; fileSize: number }> {
    if (!isS3Configured()) {
      throw new Error('S3 is not properly configured. Please check your environment variables.');
    }

    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const fileKey = `users/${userId}/posts/${timestamp}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: fileType,
      ContentLength: buffer.length,
    });

    await s3Client.send(command);

    return { fileKey, fileSize: buffer.length };
  }

  /**
   * Generate a presigned URL for uploading a profile picture to S3
   */
  async generateProfilePicturePresignedUrl(
    fileKey: string,
    fileType: string
  ): Promise<string> {
    if (!isS3Configured()) {
      throw new Error('S3 is not properly configured. Please check your environment variables.');
    }

    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: fileKey,
      ContentType: fileType,
    });

    return await getSignedUrl(s3Client, command, {
      expiresIn: s3Config.presignedUrlExpiration,
    });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!isS3Configured()) {
      throw new Error('S3 is not properly configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: fileKey,
    });

    await s3Client.send(command);
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(fileKeys: string[]): Promise<void> {
    await Promise.all(fileKeys.map((key) => this.deleteFile(key)));
  }

  /**
   * Get public URL for a file (if bucket is configured for public access)
   * Or construct CloudFront URL if available
   */
  getPublicUrl(fileKey: string): string {
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    
    if (cloudFrontDomain) {
      return `https://${cloudFrontDomain}/${fileKey}`;
    }
    
    return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${fileKey}`;
  }

  /**
   * Sanitize file name to remove special characters
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Validate if file type is an image
   */
  isImageFile(mimeType: string): boolean {
    return s3Config.allowedMimeTypes.images.includes(mimeType);
  }

  /**
   * Validate if file type is a video
   */
  isVideoFile(mimeType: string): boolean {
    return s3Config.allowedMimeTypes.videos.includes(mimeType);
  }
}

export const storageService = new StorageService();
