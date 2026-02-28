"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Video } from "@/types";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  video,
}: VideoPlayerModalProps) {
  // Extract YouTube video ID for iframe
  const extractYouTubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  };

  const extractVimeoId = (url: string) => {
    const pattern = /vimeo\.com\/(\d+)/;
    const match = url.match(pattern);
    return match?.[1] || null;
  };

  const youtubeId =
    video.video_type === "youtube"
      ? extractYouTubeId(video.video_url || "")
      : null;
  const vimeoId =
    video.video_type === "vimeo" ? extractVimeoId(video.video_url || "") : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Video Container */}
              <div className="relative aspect-video bg-black">
                {video.video_type === "youtube" && youtubeId ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : video.video_type === "vimeo" && vimeoId ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <video
                    autoPlay
                    controls
                    src={video.video_url || ""}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Info */}
              <div className="bg-[var(--card)] p-6 border-t border-[var(--border)]">
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                  {video.title}
                </h3>
                <p className="text-sm text-[var(--muted)]">{video.slug}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
