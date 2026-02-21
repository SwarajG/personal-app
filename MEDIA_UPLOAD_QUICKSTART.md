# Quick Start Guide - Media Upload Feature

This guide will help you set up and test the media upload feature.

## Prerequisites

1. AWS Account with S3 access
2. Backend and frontend running locally

## Setup Steps

### 1. Create S3 Bucket

```bash
# Using AWS CLI
aws s3api create-bucket \
  --bucket personal-diary-media \
  --region us-east-1
```

### 2. Configure CORS on S3 Bucket

Create a file `cors.json`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply CORS configuration:

```bash
aws s3api put-bucket-cors \
  --bucket personal-diary-media \
  --cors-configuration file://cors.json
```

### 3. Set Bucket Policy for Public Read

Create a file `policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::personal-diary-media/*"
    }
  ]
}
```

Apply bucket policy:

```bash
aws s3api put-bucket-policy \
  --bucket personal-diary-media \
  --policy file://policy.json
```

### 4. Create IAM User and Get Credentials

1. Go to AWS IAM Console
2. Create a new user (e.g., `personal-diary-uploader`)
3. Attach policy with these permissions:

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
      "Resource": "arn:aws:s3:::personal-diary-media/*"
    }
  ]
}
```

4. Generate access keys (Access Key ID and Secret Access Key)

### 5. Configure Backend Environment

Copy `.env.example` to `.env` in `apps/backend/`:

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` and add:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
S3_BUCKET_NAME=personal-diary-media
```

### 6. Configure Frontend Environment

Copy `.env.example` to `.env` in `apps/web/`:

```bash
cd apps/web
cp .env.example .env
```

Edit `.env` and add:

```bash
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_S3_BUCKET_NAME=personal-diary-media
```

### 7. Start the Application

In the root directory:

```bash
# Terminal 1 - Start backend
cd apps/backend
pnpm dev

# Terminal 2 - Start frontend
cd apps/web
pnpm dev
```

## Testing the Feature

### 1. Upload Images

1. Navigate to the Dashboard (http://localhost:3000)
2. Click "Add Images/Videos" button
3. Select one or more images (JPEG, PNG, GIF, WebP)
4. Click "Upload X files" button
5. Wait for upload to complete (green progress bar)
6. Write your post content
7. Click "Submit Post"
8. Enter a title and click "Publish Post"

### 2. Upload Videos

1. Click "Add Images/Videos" button
2. Select video files (MP4, MOV, AVI, WebM)
3. Upload and submit as above

### 3. View Uploaded Media

1. Navigate to "All Posts" or view posts on Dashboard
2. Posts with media will show a gallery below the content
3. Click on images to open lightbox view
4. Use arrow buttons to navigate between images
5. Videos will have native player controls

### 4. Verify in S3

Check your S3 bucket structure:

```
your-bucket-name/
└── users/
    └── {userId}/
        └── posts/
            ├── {timestamp}-image1.jpg
            ├── {timestamp}-video1.mp4
            └── {timestamp}-image2.png
```

## Troubleshooting

### Upload Button Disabled

**Symptoms**: "Add Images/Videos" button is grayed out

**Solution**:
1. Check browser console for errors
2. Verify S3 configuration is set in backend `.env`
3. Restart backend server

### Upload Fails with CORS Error

**Symptoms**: Network error in browser console mentioning CORS

**Solution**:
1. Verify CORS configuration is applied to S3 bucket
2. Ensure `AllowedOrigins` includes your frontend URL
3. Try applying CORS configuration again

### Files Upload but Don't Display

**Symptoms**: Upload succeeds but images/videos don't show

**Solution**:
1. Check bucket policy allows public read access
2. Verify `VITE_S3_BUCKET_NAME` matches actual bucket name
3. Inspect network tab to see the URL being used for media

### "File type not allowed" Error

**Symptoms**: Validation error when selecting files

**Solution**:
- Ensure file is one of: JPEG, JPG, PNG, GIF, WebP (images) or MP4, MOV, AVI, WebM (videos)
- Check file extension matches actual file type

### "File size exceeds maximum" Error

**Symptoms**: Validation error for large files

**Solution**:
- Default limit is 10MB per file
- To increase, set `MAX_FILE_SIZE` in backend `.env` (in bytes)
- Example for 50MB: `MAX_FILE_SIZE=52428800`

## Configuration Options

### Increase File Size Limit

Backend `.env`:
```bash
MAX_FILE_SIZE=52428800  # 50MB in bytes
```

### Change Presigned URL Expiration

Backend `.env`:
```bash
PRESIGNED_URL_EXPIRATION=600  # 10 minutes instead of 5
```

### Use CloudFront CDN (Optional)

1. Create CloudFront distribution pointing to S3 bucket
2. Add to backend `.env`:
   ```bash
   CLOUDFRONT_DOMAIN=d123456abcdef.cloudfront.net
   ```
3. Add to frontend `.env`:
   ```bash
   VITE_CLOUDFRONT_DOMAIN=d123456abcdef.cloudfront.net
   ```

### Change Maximum Files per Post

In the Dashboard component:
```typescript
<MediaUpload 
  onMediaUploaded={handleMediaUploaded}
  existingMedia={uploadedMedia}
  maxFiles={20}  // Change from 10 to 20
/>
```

## API Endpoints

### Get Media Configuration
```
GET /api/media/config
```

Response:
```json
{
  "maxFileSize": 10485760,
  "allowedMimeTypes": {
    "images": ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    "videos": ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]
  },
  "isConfigured": true
}
```

### Get Presigned URL (Single File)
```
POST /api/media/presigned-url
Content-Type: application/json

{
  "fileName": "vacation.jpg",
  "fileType": "image/jpeg",
  "fileSize": 2048576
}
```

Response:
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "fileKey": "users/user123/posts/1706743200000-vacation.jpg",
  "expiresIn": 300
}
```

### Get Presigned URLs (Batch)
```
POST /api/media/presigned-urls/batch
Content-Type: application/json

{
  "files": [
    {
      "fileName": "photo1.jpg",
      "fileType": "image/jpeg",
      "fileSize": 1024000
    },
    {
      "fileName": "video1.mp4",
      "fileType": "video/mp4",
      "fileSize": 5120000
    }
  ]
}
```

Response:
```json
{
  "urls": [
    {
      "uploadUrl": "https://...",
      "fileKey": "users/user123/posts/1706743200000-photo1.jpg",
      "expiresIn": 300
    },
    {
      "uploadUrl": "https://...",
      "fileKey": "users/user123/posts/1706743201000-video1.mp4",
      "expiresIn": 300
    }
  ]
}
```

## Next Steps

- Review [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) for complete documentation
- Consider setting up CloudFront CDN for better performance
- Implement image compression for smaller file sizes
- Add video thumbnail generation

## Support

If you encounter issues not covered here:

1. Check browser console for errors
2. Check backend logs for server errors
3. Verify all environment variables are set correctly
4. Ensure S3 bucket permissions are correct
5. Review [MEDIA_UPLOAD_SETUP.md](./MEDIA_UPLOAD_SETUP.md) for detailed troubleshooting
