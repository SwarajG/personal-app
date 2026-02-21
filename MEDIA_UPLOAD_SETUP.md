# Media Upload Feature Documentation

## Overview

This document describes the media upload feature that allows users to attach images and videos to their posts. The implementation uses AWS S3 for storage with presigned URLs for secure uploads.

## Architecture

### Backend Components

#### 1. S3 Configuration (`src/config/s3.ts`)
- Initializes AWS S3 client with credentials from environment variables
- Provides configuration for bucket name, region, file size limits, and allowed MIME types
- Validates S3 configuration on startup

#### 2. Storage Service (`src/services/storageService.ts`)
- **Modular Service Class**: Encapsulates all S3-related operations
- **`generatePresignedUploadUrl()`**: Creates presigned URLs for secure file uploads
- **`deleteFile()` / `deleteFiles()`**: Handles cleanup of media files
- **`getPublicUrl()`**: Constructs public URLs for accessing uploaded files
- **File Validation**: Validates file type and size before generating presigned URLs
- **Sanitization**: Sanitizes file names to prevent issues with special characters

#### 3. Media Routes (`src/routes/media.ts`)
Provides REST API endpoints:
- **POST `/api/media/presigned-url`**: Get a single presigned URL
- **POST `/api/media/presigned-urls/batch`**: Get multiple presigned URLs (up to 10 files)
- **GET `/api/media/config`**: Get upload configuration (max size, allowed types)

#### 4. Database Schema
New `Media` table tracks uploaded files:
```prisma
model Media {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  fileKey   String   // S3 file key
  fileUrl   String   // Full URL to access the file
  fileName  String   // Original file name
  fileType  String   // MIME type
  fileSize  Int      // File size in bytes
  order     Int      @default(0) // Display order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Frontend Components

#### 1. Media API (`src/api/mediaApi.ts`)
**Modular API Functions**:
- `getMediaConfig()`: Fetches upload configuration from backend
- `getPresignedUrl()`: Gets a single presigned URL
- `getPresignedUrlsBatch()`: Gets multiple presigned URLs
- `uploadFileToS3()`: Uploads file directly to S3 using presigned URL
- `getPublicUrl()`: Constructs public URL for file access

#### 2. Media Upload Service (`src/services/mediaUploadService.ts`)
**Encapsulated Upload Logic**:
- **`uploadFiles()`**: Handles batch upload with progress tracking
- **`validateFile()`**: Validates files before upload
- **File Type Checking**: `isImageFile()`, `isVideoFile()`
- **Utilities**: `formatFileSize()` for display formatting

#### 3. MediaUpload Component (`src/components/MediaUpload/`)
**Reusable Upload UI**:
- File selection with drag-and-drop support
- Image and video preview thumbnails
- Real-time upload progress indicators
- File validation with user-friendly error messages
- Support for removing files before/after upload
- Maximum file limit enforcement

#### 4. MediaGallery Component (`src/components/MediaGallery/`)
**Display Component**:
- Responsive grid layout (1-4 columns based on count)
- Image lightbox with navigation
- Video player support
- Touch-friendly controls

## Configuration

### Backend Environment Variables

Add to `apps/backend/.env`:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=your-s3-bucket-name

# Optional: CloudFront domain for CDN
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# Optional: Presigned URL expiration (seconds, default: 300)
PRESIGNED_URL_EXPIRATION=300

# Optional: Max file size (bytes, default: 10485760 = 10MB)
MAX_FILE_SIZE=10485760
```

### Frontend Environment Variables

Add to `apps/web/.env`:

```bash
# AWS Configuration (for constructing public URLs)
VITE_AWS_REGION=us-east-1
VITE_S3_BUCKET_NAME=your-s3-bucket-name

# Optional: CloudFront domain
VITE_CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

### S3 Bucket Configuration

1. **Create S3 Bucket**:
   ```bash
   aws s3api create-bucket --bucket your-bucket-name --region us-east-1
   ```

2. **Set CORS Configuration**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

3. **Set Bucket Policy** (for public read access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicRead",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

4. **IAM User Permissions**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

## Upload Flow

### 1. User Selects Files
- User clicks "Add Images/Videos" button
- File input accepts multiple files with `accept="image/*,video/*"`
- Files are validated client-side for type and size

### 2. Request Presigned URLs
- Frontend sends file metadata to backend: `POST /api/media/presigned-urls/batch`
- Backend validates:
  - User authentication
  - File type (images: JPEG, PNG, GIF, WebP; videos: MP4, MOV, AVI, WebM)
  - File size (default max: 10MB)
- Backend generates presigned URLs with:
  - Unique file keys: `users/{userId}/posts/{timestamp}-{filename}`
  - 5-minute expiration (configurable)
- Returns presigned URLs to frontend

### 3. Upload to S3
- Frontend uploads files directly to S3 using presigned URLs
- Uses `PUT` requests with `Content-Type` headers
- Tracks upload progress for each file
- No backend involvement in actual upload (reduces server load)

### 4. Create Post with Media
- User completes post creation
- Frontend sends post data with media metadata to backend
- Backend creates post record with associated media records
- Media records include: fileKey, fileUrl, fileName, fileType, fileSize

### 5. Display Media
- Posts are fetched with associated media
- MediaGallery component renders images/videos
- Supports lightbox view for images
- Native video player for videos

## File Organization

```
S3 Bucket Structure:
└── users/
    └── {userId}/
        └── posts/
            ├── 1706743200000-image1.jpg
            ├── 1706743201000-video1.mp4
            └── 1706743202000-image2.png
```

## Features

### ✅ Implemented
- Multiple file upload (images and videos)
- File type validation (images: JPEG, PNG, GIF, WebP; videos: MP4, MOV, AVI, WebM)
- File size validation (configurable, default 10MB)
- Upload progress tracking
- File preview thumbnails
- Remove files before/after upload
- Presigned URL generation for secure uploads
- Direct S3 uploads (bypasses backend)
- User-specific folder structure
- Configurable S3 bucket
- Media gallery with lightbox
- Responsive grid layout
- Database persistence
- Integration with post creation

### 🔒 Security
- Presigned URLs with 5-minute expiration
- User authentication required
- File type whitelist
- File size limits
- User-specific folders (no cross-user access)
- Sanitized file names

### 📊 Performance
- Direct S3 uploads (no backend proxy)
- Batch presigned URL generation
- Optional CloudFront CDN support
- Lazy loading of media in gallery
- Optimized thumbnail rendering

## Usage Example

### Creating a Post with Media

```typescript
// In Dashboard component
const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])

const handleMediaUploaded = (media: UploadedMedia[]) => {
  setUploadedMedia(media)
}

// In render
<MediaUpload 
  onMediaUploaded={handleMediaUploaded}
  existingMedia={uploadedMedia}
  maxFiles={10}
/>

// When submitting post
await createPost({
  title,
  content,
  date: new Date().toISOString(),
  media: uploadedMedia,
})
```

### Displaying Media in Posts

```typescript
// In PostList component
import { MediaGallery } from '@/components/MediaGallery'

{post.media && post.media.length > 0 && (
  <div className="pt-3">
    <MediaGallery media={post.media} />
  </div>
)}
```

## Troubleshooting

### Upload Fails
1. **Check S3 configuration**: Ensure environment variables are set correctly
2. **Verify CORS settings**: Make sure your frontend origin is allowed
3. **Check file size**: Ensure files don't exceed the configured limit
4. **Verify IAM permissions**: Ensure the IAM user has necessary permissions

### Files Not Displaying
1. **Check bucket policy**: Ensure public read access is configured
2. **Verify CloudFront settings**: If using CloudFront, ensure domain is correct
3. **Check file URLs**: Inspect network tab to see if URLs are correct

### Performance Issues
1. **Enable CloudFront CDN**: Improves global delivery speed
2. **Optimize file sizes**: Compress images/videos before upload
3. **Consider lazy loading**: Load media on demand

## Future Enhancements

- [ ] Image compression before upload
- [ ] Video transcoding
- [ ] Drag-and-drop file upload
- [ ] Paste images from clipboard
- [ ] Image editing (crop, rotate, filters)
- [ ] Progressive image loading
- [ ] WebP conversion for images
- [ ] Thumbnail generation
- [ ] Duplicate file detection
- [ ] Upload resumption for large files

## Code Modularity

The implementation follows best practices for modularity:

1. **Separation of Concerns**:
   - Configuration (`s3.ts`)
   - Business Logic (`storageService.ts`, `mediaUploadService.ts`)
   - API Layer (`mediaApi.ts`, `media.ts routes`)
   - UI Components (`MediaUpload`, `MediaGallery`)

2. **Reusable Components**:
   - `MediaUpload` can be used anywhere in the app
   - `MediaGallery` is independent of post context
   - Services are singleton instances

3. **Type Safety**:
   - TypeScript interfaces for all data structures
   - Proper typing for API requests/responses

4. **Error Handling**:
   - Validation at multiple layers
   - User-friendly error messages
   - Graceful degradation when S3 is not configured

5. **Testability**:
   - Services can be mocked for testing
   - Components accept props for easy testing
   - Clear separation of logic and presentation
