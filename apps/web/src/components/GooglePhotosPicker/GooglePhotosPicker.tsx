import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Images, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  getConnectionStatus,
  createPickerSession,
  getPickerSession,
  importPhotos,
  type PickerMediaItem,
} from '../../api/googlePhotosApi';
import type { UploadedMedia } from '../../api/mediaApi';

interface GooglePhotosPickerProps {
  open: boolean;
  onClose: () => void;
  onPhotosImported: (media: UploadedMedia[]) => void;
}

type PickerState = 'idle' | 'opening' | 'waiting' | 'importing' | 'done';

function openCenteredPopup(url: string, title: string, w: number, h: number): Window | null {
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  return window.open(url, title, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

export const GooglePhotosPicker: React.FC<GooglePhotosPickerProps> = ({
  open,
  onClose,
  onPhotosImported,
}) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [pickerState, setPickerState] = useState<PickerState>('idle');
  const [pickerUri, setPickerUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  const sessionIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef = useRef<Window | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const checkConnection = useCallback(async () => {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPickerState('idle');
      setError(null);
      setSelectedCount(0);
      setPickerUri(null);
      sessionIdRef.current = null;
      checkConnection();
    }
    return () => stopPolling();
  }, [open, checkConnection]);

  const startPolling = (sessionId: string) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await getPickerSession(sessionId);

        if (result.done && result.mediaItems) {
          stopPolling();
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
          }
          popupRef.current = null;
          setPickerUri(null);

          if (result.mediaItems.length === 0) {
            setPickerState('idle');
            setError('No photos were selected.');
            return;
          }

          setSelectedCount(result.mediaItems.length);
          await handleImport(result.mediaItems);
        }
      } catch {
        stopPolling();
        setPickerState('idle');
        setPickerUri(null);
        setError('Failed to check picker status. Please try again.');
      }
    }, 3000);
  };

  const handleOpenPicker = async () => {
    setPickerState('opening');
    setError(null);

    try {
      const { sessionId, pickerUri: uri } = await createPickerSession();
      sessionIdRef.current = sessionId;
      setPickerUri(uri);

      const popup = openCenteredPopup(uri, 'google-photos-picker', 900, 700);
      popupRef.current = popup;

      if (!popup) {
        setPickerState('idle');
        setError('Popup was blocked. Please allow popups for this site and try again.');
        return;
      }

      setPickerState('waiting');
      startPolling(sessionId);
    } catch {
      setPickerState('idle');
      setError('Failed to open Google Photos picker. Please try again.');
    }
  };

  const handleReopenPopup = () => {
    if (pickerUri) {
      const popup = openCenteredPopup(pickerUri, 'google-photos-picker', 900, 700);
      popupRef.current = popup;
    }
  };

  const handleImport = async (mediaItems: PickerMediaItem[]) => {
    setPickerState('importing');
    try {
      const uploaded = await importPhotos(mediaItems);
      onPhotosImported(uploaded);
      setPickerState('done');
      setTimeout(() => onClose(), 1000);
    } catch {
      setPickerState('idle');
      setError('Failed to import photos. Please try again.');
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = 'http://localhost:4000/api/auth/google';
  };

  const handleClose = () => {
    stopPolling();
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="w-5 h-5" />
            Google Photos
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {connected === null && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {connected === false && (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <Images className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Connect Google Photos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in with Google to access your Google Photos library.
                </p>
              </div>
              <Button onClick={handleConnectGoogle}>Connect Google Photos</Button>
            </div>
          )}

          {connected === true && (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              {pickerState === 'idle' && (
                <>
                  <Images className="w-12 h-12 text-blue-500" />
                  <div>
                    <p className="font-medium">Select photos from Google Photos</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A Google Photos picker will open in a small popup window.
                      Select your photos, then click Done.
                    </p>
                  </div>
                  <Button onClick={handleOpenPicker}>Open Google Photos Picker</Button>
                </>
              )}

              {pickerState === 'opening' && (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="text-sm text-muted-foreground">Opening picker...</p>
                </>
              )}

              {pickerState === 'waiting' && (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <div>
                    <p className="font-medium">Waiting for selection</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select your photos in the popup window, then click <strong>Done</strong>.
                      This dialog will update automatically.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReopenPopup} className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Reopen picker window
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
                </>
              )}

              {pickerState === 'importing' && (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <div>
                    <p className="font-medium">Importing {selectedCount} photo{selectedCount !== 1 ? 's' : ''}...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Downloading and uploading to storage.
                    </p>
                  </div>
                </>
              )}

              {pickerState === 'done' && (
                <>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-medium text-green-700">
                    {selectedCount} photo{selectedCount !== 1 ? 's' : ''} imported!
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded mt-2">
              {error}
            </div>
          )}
        </div>

        {connected === true && pickerState === 'idle' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
