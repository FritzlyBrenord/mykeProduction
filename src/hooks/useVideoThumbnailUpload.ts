'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseVideoThumbnailUploadResult {
  uploadingThumbnail: boolean;
  error: string | null;
  uploadThumbnail: (thumbnailBlob: Blob) => Promise<string>;
}

export function useVideoThumbnailUpload(): UseVideoThumbnailUploadResult {
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadThumbnail = useCallback(
    async (thumbnailBlob: Blob): Promise<string> => {
      try {
        setUploadingThumbnail(true);
        setError(null);

        // Generate unique filename
        const filename = `thumbnail_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const path = `thumbnails/${filename}`;

        // Upload to Supabase
        const { data, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(path, thumbnailBlob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        if (!data?.path) throw new Error('No path returned from upload');

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('videos').getPublicUrl(data.path);

        return publicUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload thumbnail';
        setError(message);
        throw err;
      } finally {
        setUploadingThumbnail(false);
      }
    },
    []
  );

  return {
    uploadingThumbnail,
    error,
    uploadThumbnail,
  };
}
