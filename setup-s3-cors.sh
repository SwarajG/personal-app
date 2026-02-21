#!/bin/bash

# S3 CORS Configuration Script
# This script applies the correct CORS configuration to your S3 bucket

# Get bucket name from .env file
if [ -f "apps/backend/.env" ]; then
    export $(grep S3_BUCKET_NAME apps/backend/.env | xargs)
fi

# Check if bucket name is set
if [ -z "$S3_BUCKET_NAME" ]; then
    echo "Error: S3_BUCKET_NAME not found in apps/backend/.env"
    echo "Please set S3_BUCKET_NAME in your .env file"
    exit 1
fi

echo "Applying CORS configuration to bucket: $S3_BUCKET_NAME"

# Apply CORS configuration
aws s3api put-bucket-cors \
    --bucket "$S3_BUCKET_NAME" \
    --cors-configuration file://s3-cors-config.json

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "CORS Configuration:"
    aws s3api get-bucket-cors --bucket "$S3_BUCKET_NAME"
else
    echo "❌ Failed to apply CORS configuration"
    echo ""
    echo "Manual steps:"
    echo "1. Go to AWS Console > S3 > $S3_BUCKET_NAME"
    echo "2. Go to Permissions tab"
    echo "3. Scroll to Cross-origin resource sharing (CORS)"
    echo "4. Click Edit and paste the contents of s3-cors-config.json"
    exit 1
fi
