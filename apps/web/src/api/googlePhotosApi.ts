import axios from 'axios';
import type { UploadedMedia } from './mediaApi';

const API_BASE = 'http://localhost:4000/api/google-photos';

export interface PickerMediaItem {
  id: string;
  createTime: string;
  type: string;
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename: string;
    mediaFileMetadata?: {
      width: number;
      height: number;
    };
  };
}

export interface ConnectionStatus {
  connected: boolean;
}

export const getConnectionStatus = async (): Promise<ConnectionStatus> => {
  const response = await axios.get(`${API_BASE}/connection-status`, {
    withCredentials: true,
  });
  return response.data;
};

export const createPickerSession = async (): Promise<{ sessionId: string; pickerUri: string }> => {
  const response = await axios.post(`${API_BASE}/picker/session`, {}, { withCredentials: true });
  return response.data;
};

export const getPickerSession = async (
  sessionId: string
): Promise<{ done: boolean; mediaItems?: PickerMediaItem[] }> => {
  const response = await axios.get(`${API_BASE}/picker/session/${sessionId}`, {
    withCredentials: true,
  });
  return response.data;
};

export const importPhotos = async (mediaItems: PickerMediaItem[]): Promise<UploadedMedia[]> => {
  const response = await axios.post(
    `${API_BASE}/import`,
    { mediaItems },
    { withCredentials: true }
  );
  return response.data.uploadedMedia;
};
