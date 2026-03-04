'use client';

import { useState, useCallback } from 'react';

interface UploadProgress {
  loaded: number;
  total: number;
}

interface UseVideoUploadResult {
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  uploadVideo: (file: File) => Promise<string>;
}

export function useVideoUpload(): UseVideoUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = useCallback(async (file: File): Promise<string> => {
    try {
      setUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size });

      // Validate video file
      if (!file.type.startsWith('video/')) {
        throw new Error('Only video files are allowed');
      }

      const initResponse = await fetch('/api/admin/videos/upload-video/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      const initPayload = (await initResponse
        .json()
        .catch(() => null)) as { signedUrl?: string; url?: string; error?: string } | null;
      if (!initResponse.ok || !initPayload?.signedUrl || !initPayload.url) {
        throw new Error(initPayload?.error || 'Unable to initialize upload');
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress({ loaded: e.loaded, total: e.total });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress({ loaded: file.size, total: file.size });
            setTimeout(() => setProgress(null), 500);
            resolve(initPayload.url as string);
          } else {
            let uploadError = 'Upload failed';
            try {
              const body = JSON.parse(xhr.responseText || '{}') as { error?: string; message?: string };
              uploadError = body.error || body.message || uploadError;
            } catch {
              if (xhr.responseText) {
                uploadError = xhr.responseText;
              }
            }
            reject(new Error(uploadError));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload error'));
        });

        xhr.open('PUT', initPayload.signedUrl as string);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, progress, error, uploadVideo };
}
