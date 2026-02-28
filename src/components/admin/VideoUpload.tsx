"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Check, AlertCircle, Loader } from "lucide-react";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useVideoThumbnailUpload } from "@/hooks/useVideoThumbnailUpload";
import {
  extractYouTubeId,
  extractVimeoId,
  getYouTubeThumbnail,
  generateVideoThumbnailFromFile,
} from "@/lib/video-utils";

interface VideoUploadProps {
  videoType: "upload" | "youtube" | "vimeo";
  onVideoUrlChange: (url: string) => void;
  onThumbnailChange?: (thumbnailUrl: string | null) => void;
  currentUrl?: string;
  currentThumbnail?: string | null;
}

export function VideoUpload({
  videoType,
  onVideoUrlChange,
  onThumbnailChange,
  currentUrl,
  currentThumbnail,
}: VideoUploadProps) {
  const { uploading, progress, error, uploadVideo } = useVideoUpload();
  const { uploadThumbnail } = useVideoThumbnailUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentUrl || null,
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    currentThumbnail || null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(currentUrl);
    }
    if (currentThumbnail) {
      setThumbnailUrl(currentThumbnail);
    }
  }, [currentUrl, currentThumbnail]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadSuccess(false);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + Math.random() * 30, 90));
      }, 200);

      const url = await uploadVideo(file);

      // Generate and upload thumbnail
      try {
        const thumbnail = await generateVideoThumbnailFromFile(file, 1);
        const thumbnailUrl = await uploadThumbnail(thumbnail);
        setThumbnailUrl(thumbnailUrl);
        onThumbnailChange?.(thumbnailUrl);
      } catch (thumbError) {
        console.error("Error generating/uploading thumbnail:", thumbError);
        // Thumbnail upload failed but video uploaded successfully - continue anyway
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setPreviewUrl(url);
      onVideoUrlChange(url);

      setUploadSuccess(true);

      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const handleYouTubeUrlChange = (value: string) => {
    setYoutubeError(null);
    onVideoUrlChange(value);

    if (value.trim()) {
      const videoId = extractYouTubeId(value);
      if (videoId) {
        setPreviewUrl(value);
        // Get YouTube thumbnail (no upload needed, direct URL)
        const thumbnail = getYouTubeThumbnail(value);
        setThumbnailUrl(thumbnail);
        onThumbnailChange?.(thumbnail);
      } else if (value.length > 0) {
        setYoutubeError(
          "URL YouTube invalide. Formats acceptés: youtube.com/watch?v=... ou youtu.be/...",
        );
        setPreviewUrl(null);
        setThumbnailUrl(null);
        onThumbnailChange?.(null);
      }
    } else {
      setPreviewUrl(null);
      setThumbnailUrl(null);
      onThumbnailChange?.(null);
    }
  };

  const handleVimeoUrlChange = (value: string) => {
    setYoutubeError(null);
    onVideoUrlChange(value);

    if (value.trim()) {
      const videoId = extractVimeoId(value);
      if (videoId) {
        setPreviewUrl(value);
        // Vimeo thumbnails require API - for now set to null
        setThumbnailUrl(null);
        onThumbnailChange?.(null);
      } else if (value.length > 0) {
        setYoutubeError("URL Vimeo invalide. Format: vimeo.com/...");
        setPreviewUrl(null);
        setThumbnailUrl(null);
        onThumbnailChange?.(null);
      }
    } else {
      setPreviewUrl(null);
      setThumbnailUrl(null);
      onThumbnailChange?.(null);
    }
  };

  if (videoType === "youtube") {
    const youtubeId = previewUrl ? extractYouTubeId(previewUrl) : null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            URL YouTube
          </label>
          <div className="relative">
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
              onChange={(e) => handleYouTubeUrlChange(e.target.value)}
              defaultValue={currentUrl || ""}
              className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            {youtubeId && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          {youtubeError && (
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{youtubeError}</p>
            </div>
          )}
        </div>

        {youtubeId && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Aperçu
            </p>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--border)]">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setThumbnailUrl(null);
                  onVideoUrlChange("");
                  onThumbnailChange?.(null);
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (videoType === "vimeo") {
    const vimeoId = previewUrl ? extractVimeoId(previewUrl) : null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            URL Vimeo
          </label>
          <div className="relative">
            <input
              type="url"
              placeholder="https://vimeo.com/..."
              onChange={(e) => handleVimeoUrlChange(e.target.value)}
              defaultValue={currentUrl || ""}
              className="w-full px-4 py-2 bg-[var(--input)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            {vimeoId && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          {youtubeError && (
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-500">{youtubeError}</p>
            </div>
          )}
        </div>

        {vimeoId && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Aperçu
            </p>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--border)]">
              <iframe
                src={previewUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setThumbnailUrl(null);
                  onVideoUrlChange("");
                  onThumbnailChange?.(null);
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-3">
        Fichier vidéo
        <span className="text-xs text-[var(--muted)] font-normal ml-1">
          (Max 500MB)
        </span>
      </label>

      {/* Upload Zone */}
      {!previewUrl && !uploading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <div className="p-3 bg-[var(--primary)]/10 rounded-lg mb-3 group-hover:bg-[var(--primary)]/20 transition-colors">
              <Upload className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <p className="text-[var(--foreground)] font-medium mb-1">
              Déposez votre vidéo ici
            </p>
            <p className="text-sm text-[var(--muted)]">
              ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-[var(--muted)] mt-2">
              MP4, WebM, Ogg... jusqu'à 500MB
            </p>
          </div>
        </div>
      )}

      {/* Uploading */}
      {uploading && (
        <div className="border-2 border-dashed border-[var(--primary)]/30 rounded-lg p-8 text-center bg-[var(--primary)]/5">
          <div className="flex justify-center mb-4">
            <div className="relative w-12 h-12">
              <svg
                className="w-12 h-12 animate-spin text-[var(--primary)]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
          <p className="text-[var(--foreground)] font-medium mb-4">
            Upload en cours... {Math.round(uploadProgress)}%
          </p>
          <div className="w-full bg-[var(--input)] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[var(--primary)] h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {uploadSuccess && (
        <div className="border-2 border-dashed border-green-500/30 rounded-lg p-8 text-center bg-green-500/5">
          <div className="flex justify-center mb-3">
            <Check className="w-12 h-12 text-green-500" />
          </div>
          <p className="text-green-500 font-medium">
            Vidéo uploadée avec succès !
          </p>
        </div>
      )}

      {/* Error */}
      {error && !uploadSuccess && (
        <div className="border-2 border-dashed border-red-500/30 rounded-lg p-8 text-center bg-red-500/5">
          <div className="flex justify-center mb-3">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      )}

      {/* Preview */}
      {previewUrl && !uploading && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Aperçu vidéo
          </p>
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-[var(--border)]">
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => {
                setPreviewUrl(null);
                setThumbnailUrl(null);
                onVideoUrlChange("");
                onThumbnailChange?.(null);
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          {thumbnailUrl && (
            <div className="pt-2">
              <p className="text-xs text-[var(--muted)] mb-2">
                Couverture générée
              </p>
              <img
                src={thumbnailUrl}
                alt="Couverture"
                className="w-full aspect-video object-cover rounded-lg border border-[var(--border)]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
