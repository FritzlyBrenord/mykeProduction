import { useState, useCallback } from 'react';
import { Video } from '@/types';

interface UseVideosResult {
  videos: Video[];
  loading: boolean;
  error: string | null;
  fetchVideos: () => Promise<void>;
  createVideo: (video: Omit<Video, 'id' | 'created_at' | 'view_count'>) => Promise<Video>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  changeStatus: (id: string, status: 'published' | 'draft' | 'archived') => Promise<Video>;
}

export function useVideos(): UseVideosResult {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/videos');
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const data = await response.json();
      setVideos(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createVideo = useCallback(async (video: Omit<Video, 'id' | 'created_at' | 'view_count'>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
      });

      if (!response.ok) {
        throw new Error('Failed to create video');
      }

      const newVideo = await response.json();
      setVideos([newVideo, ...videos]);
      return newVideo;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [videos]);

  const updateVideo = useCallback(async (id: string, updates: Partial<Video>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update video');
      }

      const updatedVideo = await response.json();
      setVideos(videos.map(v => v.id === id ? updatedVideo : v));
      return updatedVideo;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [videos]);

  const deleteVideo = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/videos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete video');
      }

      setVideos(videos.filter(v => v.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [videos]);

  const changeStatus = useCallback(async (
    id: string,
    status: 'published' | 'draft' | 'archived'
  ) => {
    return updateVideo(id, { status });
  }, [updateVideo]);

  return {
    videos,
    loading,
    error,
    fetchVideos,
    createVideo,
    updateVideo,
    deleteVideo,
    changeStatus,
  };
}
