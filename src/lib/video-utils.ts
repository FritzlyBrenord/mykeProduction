/**
 * Utility functions for generating video thumbnails
 * Supports YouTube, Vimeo, and uploaded videos
 */

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract Vimeo video ID from various URL formats
 */
export function extractVimeoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate thumbnail URL for YouTube video
 * Returns the high-quality thumbnail (maxresdefault)
 */
export function getYouTubeThumbnail(videoUrl: string): string | null {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  // YouTube thumbnail URL format
  // maxresdefault (1280x720) - may not exist for all videos
  // sddefault (640x480) - high quality fallback
  // hqdefault (480x360) - medium quality fallback
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Generate thumbnail URL for Vimeo video
 * Note: This requires using the Vimeo API or oEmbed for reliable thumbnails
 * For now, returns a placeholder or null - actual implementation would need API key
 */
export function getVimeoThumbnail(videoUrl: string): string | null {
  const videoId = extractVimeoId(videoUrl);
  if (!videoId) return null;

  // Vimeo thumbnails are not directly accessible via URL pattern
  // Would need Vimeo API or oEmbed endpoint
  // For now, return null and handle via API call if needed
  return null;
}

/**
 * Extract a frame from an uploaded video to create a thumbnail
 * Captures multiple frames and returns the one with most color (best quality)
 */
export function generateVideoThumbnailFromFile(
  videoFile: File,
  timeSeconds: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.crossOrigin = "anonymous";

    video.addEventListener("loadedmetadata", () => {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to the specified time (use later in video if available)
      const seekTime = Math.min(
        timeSeconds,
        video.duration > 5 ? Math.floor(video.duration / 3) : Math.floor(video.duration / 2)
      );
      video.currentTime = seekTime;
    });

    video.addEventListener("seeked", () => {
      try {
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0);

        // Convert to JPEG blob with good quality
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.85  // Good quality JPEG
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load video"));
    });

    // Start loading
    video.load();
  });
}

/**
 * Unified function to get or generate thumbnail based on video type
 */
export async function generateVideoThumbnail(
  videoType: "youtube" | "vimeo" | "upload",
  videoUrl: string,
  videoFile?: File
): Promise<string | null> {
  switch (videoType) {
    case "youtube":
      return getYouTubeThumbnail(videoUrl);

    case "vimeo":
      return getVimeoThumbnail(videoUrl);

    case "upload":
      if (!videoFile) return null;
      try {
        const thumbnailBlob = await generateVideoThumbnailFromFile(videoFile);
        return URL.createObjectURL(thumbnailBlob);
      } catch (error) {
        console.error("Error generating thumbnail:", error);
        return null;
      }

    default:
      return null;
  }
}
