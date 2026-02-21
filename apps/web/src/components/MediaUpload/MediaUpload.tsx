import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image, Video, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { getMediaConfig } from '../../api/mediaApi';
import { mediaUploadService } from '../../services/mediaUploadService';
import type { UploadProgress } from '../../services/mediaUploadService';
import type { UploadedMedia } from '../../api/mediaApi';

interface MediaUploadProps {
  onMediaUploaded: (media: UploadedMedia[]) => void;
  existingMedia?: UploadedMedia[];
  maxFiles?: number;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaUploaded,
  existingMedia = [],
  maxFiles = 10,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>(existingMedia);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaConfig, setMediaConfig] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch media configuration
    getMediaConfig()
      .then((config) => {
        setMediaConfig(config);
        if (!config.isConfigured) {
          setError('Media upload is not configured on the server. Please contact administrator.');
        }
      })
      .catch((err) => {
        console.error('Failed to fetch media config:', err);
        setError('Failed to load media configuration. Please refresh the page.');
      });
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (!mediaConfig) {
      setError('Media configuration not loaded');
      return;
    }

    if (!mediaConfig.isConfigured) {
      setError('Media upload is not configured on the server');
      return;
    }

    // Check max files limit
    const totalFiles = selectedFiles.length + uploadedMedia.length + files.length;
    if (totalFiles > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = mediaUploadService.validateFile(
        file,
        mediaConfig.maxFileSize,
        mediaConfig.allowedMimeTypes
      );

      if (!validation.valid) {
        setError(validation.error || 'File validation failed');
        return;
      }

      validFiles.push(file);
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
    setError(null);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleRemoveUploadedMedia = (index: number) => {
    const newMedia = uploadedMedia.filter((_, i) => i !== index);
    setUploadedMedia(newMedia);
    onMediaUploaded(newMedia);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploaded = await mediaUploadService.uploadFiles(
        selectedFiles,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      const newMedia = [...uploadedMedia, ...uploaded];
      setUploadedMedia(newMedia);
      onMediaUploaded(newMedia);
      setSelectedFiles([]);
      setUploadProgress([]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const renderFilePreview = (file: File, index: number) => {
    const isImage = mediaUploadService.isImageFile(file);
    const isVideo = mediaUploadService.isVideoFile(file);
    const objectUrl = URL.createObjectURL(file);

    return (
      <div key={index} className="relative group">
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          {isImage && (
            <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" />
          )}
          {isVideo && (
            <div className="relative w-full h-full">
              <video src={objectUrl} className="w-full h-full object-cover" />
              <Video className="absolute inset-0 m-auto w-8 h-8 text-white opacity-70" />
            </div>
          )}
        </div>
        <button
          onClick={() => handleRemoveFile(index)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs mt-1 truncate w-24" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {mediaUploadService.formatFileSize(file.size)}
        </p>
      </div>
    );
  };

  const renderUploadedMedia = (media: UploadedMedia, index: number) => {
    const isImage = media.fileType.startsWith('image/');
    const isVideo = media.fileType.startsWith('video/');

    const baseURL = import.meta.env.VITE_CLOUDFRONT_DOMAIN;

    console.log('media: ', baseURL + media.fileKey);

    return (
      <div key={index} className="relative group">
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          {isImage && (
            <img src={media.fileUrl} alt={media.fileName} className="w-full h-full object-cover" />
          )}
          {isVideo && (
            <div className="relative w-full h-full">
              <video src={media.fileUrl} className="w-full h-full object-cover" />
              <Video className="absolute inset-0 m-auto w-8 h-8 text-white opacity-70" />
            </div>
          )}
        </div>
        <button
          onClick={() => handleRemoveUploadedMedia(index)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs mt-1 truncate w-24" title={media.fileName}>
          {media.fileName}
        </p>
        <p className="text-xs text-gray-500">
          {mediaUploadService.formatFileSize(media.fileSize)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || uploadedMedia.length + selectedFiles.length >= maxFiles}
        >
          <Image className="w-4 h-4 mr-2" />
          Add Images/Videos
        </Button>

        {selectedFiles.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Uploaded Media */}
      {uploadedMedia.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Uploaded ({uploadedMedia.length})</p>
          <div className="flex flex-wrap gap-4">
            {uploadedMedia.map((media, index) => renderUploadedMedia(media, index))}
          </div>
        </div>
      )}

      {/* Selected Files to Upload */}
      {selectedFiles.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Selected Files ({selectedFiles.length})
          </p>
          <div className="flex flex-wrap gap-4">
            {selectedFiles.map((file, index) => renderFilePreview(file, index))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Upload Progress</p>
          {uploadProgress.map((progress, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate flex-1">{progress.fileName}</span>
                <span className="text-gray-500">
                  {progress.status === 'completed' ? '100%' : `${progress.progress}%`}
                </span>
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    progress.status === 'error'
                      ? 'bg-red-500'
                      : progress.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-xs text-red-600">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {mediaConfig && (
        <p className="text-xs text-gray-500">
          Max file size: {mediaUploadService.formatFileSize(mediaConfig.maxFileSize)} • 
          Max files: {maxFiles} • 
          Supported: Images (JPEG, PNG, GIF, WebP) and Videos (MP4, MOV, AVI, WebM)
        </p>
      )}
    </div>
  );
};
