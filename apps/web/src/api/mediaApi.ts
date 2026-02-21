import axios from 'axios';

export interface MediaUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface MediaConfigResponse {
  maxFileSize: number;
  allowedMimeTypes: {
    images: string[];
    videos: string[];
  };
  isConfigured: boolean;
}

export interface UploadedMedia {
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
}

const API_BASE_URL = 'http://localhost:4000/api';

/**
 * Get media upload configuration
 */
export const getMediaConfig = async (): Promise<MediaConfigResponse> => {
  const response = await axios.get(`${API_BASE_URL}/media/config`, {
    withCredentials: true,
  });
  return response.data;
};

/**
 * Get presigned URL for single file upload
 */
export const getPresignedUrl = async (
  request: MediaUploadRequest
): Promise<PresignedUrlResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/media/presigned-url`,
    request,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Get presigned URLs for batch file upload
 */
export const getPresignedUrlsBatch = async (
  files: MediaUploadRequest[]
): Promise<{ urls: PresignedUrlResponse[] }> => {
  const response = await axios.post(
    `${API_BASE_URL}/media/presigned-urls/batch`,
    { files },
    {
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Upload file to S3 using presigned URL
 */
export const uploadFileToS3 = async (
  presignedUrl: string,
  file: File
): Promise<void> => {
  await axios.put(presignedUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  });
};

/**
 * Get public URL for uploaded file
 */
export const getPublicUrl = (fileKey: string): string => {
  // This should match the backend logic
  const cloudFrontDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN;
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
  const bucketName = import.meta.env.VITE_S3_BUCKET_NAME;
  
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${fileKey}`;
  }
  
  return `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
};
