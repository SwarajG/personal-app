import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`Warning: Missing S3 configuration: ${missingVars.join(', ')}. S3 upload features will be disabled.`);
}

export const s3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET_NAME || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  presignedUrlExpiration: parseInt(process.env.PRESIGNED_URL_EXPIRATION || '300'), // 5 minutes default
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  },
};

// Create S3 client
export const s3Client = new S3Client({
  region: s3Config.region,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
  },
});

// Check if S3 is properly configured
export const isS3Configured = (): boolean => {
  return !!(
    s3Config.bucket &&
    s3Config.accessKeyId &&
    s3Config.secretAccessKey &&
    s3Config.region
  );
};
