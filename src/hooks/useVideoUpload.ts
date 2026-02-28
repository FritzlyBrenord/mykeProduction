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

      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        throw new Error('Video exceeds 500MB limit');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'videos');

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress({ loaded: e.loaded, total: e.total });
        }
      });

      return new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setProgress({ loaded: file.size, total: file.size });
            setTimeout(() => setProgress(null), 500);
            // API retourne { urls: [...] }
            resolve(response.urls[0]);
          } else {
            const response = JSON.parse(xhr.responseText);
            reject(new Error(response.error || 'Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload error'));
        });

        xhr.open('POST', '/api/admin/upload');
        xhr.send(formData);
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
