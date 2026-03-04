"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShareButton from "@/components/share/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/hooks/useCart";
import { useAuth } from "@/lib/hooks/useAuth";
import { Video } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils/format";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  Play,
  Reply,
  Send,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type VideoDetail = Video & {
  description?: string | null;
  like_count?: number;
  comment_count?: number;
  allow_comments?: boolean;
  can_watch: boolean;
  requires_auth: boolean;
  requires_purchase: boolean;
  purchased: boolean;
};

type VideoComment = {
  id: string;
  user_id: string;
  video_id: string | null;
  content: string;
  status: "approved" | "pending" | "rejected";
  parent_id: string | null;
  likes: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type VideoCommentNode = VideoComment & { replies: VideoCommentNode[] };

type VideoDetailResponse = {
  data: VideoDetail;
  related: VideoDetail[];
};

type CommentPayload = {
  error?: string;
  message?: string;
  data?: VideoComment;
};

type LikePayload = {
  error?: string;
  likes?: number;
  liked?: boolean;
  already_liked?: boolean;
};

type CommentsMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type CommentsResponse = {
  data: VideoComment[];
  meta: CommentsMeta;
  migration_required?: boolean;
};

const COMMENTS_PER_PAGE = 10;
const DEVICE_ID_STORAGE_KEY = "myke_device_id";

function buildCommentTree(input: VideoComment[]): VideoCommentNode[] {
  const sorted = [...input].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const byId = new Map<string, VideoCommentNode>();
  sorted.forEach((comment) => {
    byId.set(comment.id, { ...comment, replies: [] });
  });

  const roots: VideoCommentNode[] = [];
  sorted.forEach((comment) => {
    const node = byId.get(comment.id);
    if (!node) return;

    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id)?.replies.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

function extractYouTubeId(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/i,
    /youtu\.be\/([^&\n?#]+)/i,
    /youtube\.com\/embed\/([^&\n?#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractVimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] || null;
}

function accessLabel(video: VideoDetail) {
  if (video.access_type === "public") return "Acces public";
  if (video.access_type === "members") return "Reserve aux membres connectes";
  return `Acces payant (${formatPrice(Number(video.price || 0), "USD")})`;
}

function compact(value: number) {
  return Number(value || 0).toLocaleString("fr-FR");
}

export default function VideoDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [related, setRelated] = useState<VideoDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isLikingVideo, setIsLikingVideo] = useState(false);
  const [likedVideo, setLikedVideo] = useState(false);

  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentsMeta, setCommentsMeta] = useState<CommentsMeta>({
    total: 0,
    page: 1,
    limit: COMMENTS_PER_PAGE,
    totalPages: 1,
  });
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [likingMap, setLikingMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<
    Record<string, boolean>
  >({});
  const [migrationRequired, setMigrationRequired] = useState(false);

  const trackedSlugRef = useRef<string | null>(null);
  const commentsRef = useRef<HTMLDivElement | null>(null);

  const slug = useMemo(() => {
    if (!params?.slug) return "";
    return Array.isArray(params.slug) ? params.slug[0] : params.slug;
  }, [params]);

  const getDeviceId = useCallback(() => {
    if (typeof window === "undefined") return "server";

    try {
      const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (existing) return existing;
      const generated =
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
      return generated;
    } catch {
      return `fallback-${Date.now()}`;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fetchVideo = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setErrorMessage(null);
        setLikedVideo(false);

        const response = await fetch(
          `/api/videos/${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Video introuvable.");
          }
          throw new Error("Impossible de charger cette video.");
        }

        const payload = (await response.json()) as VideoDetailResponse;
        if (!active) return;

        setVideo(payload.data);
        setRelated(Array.isArray(payload.related) ? payload.related : []);
      } catch (error) {
        if (!active) return;
        setVideo(null);
        setRelated([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Erreur de chargement.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchVideo();

    return () => {
      active = false;
    };
  }, [slug, user?.id]);

  const fetchComments = useCallback(
    async (page: number) => {
      if (!slug || !video?.can_watch || !video?.allow_comments) return;

      try {
        setCommentsLoading(true);

        const response = await fetch(
          `/api/videos/${encodeURIComponent(slug)}/commentaires?page=${page}&limit=${COMMENTS_PER_PAGE}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Impossible de charger les commentaires.");
        }

        const payload = (await response.json()) as
          | CommentsResponse
          | VideoComment[];

        if (Array.isArray(payload)) {
          setComments(payload);
          setCommentsMeta({
            total: payload.length,
            page: 1,
            limit: payload.length || COMMENTS_PER_PAGE,
            totalPages: 1,
          });
          setMigrationRequired(false);
          return;
        }

        setComments(Array.isArray(payload.data) ? payload.data : []);
        setCommentsMeta(
          payload.meta || {
            total: 0,
            page,
            limit: COMMENTS_PER_PAGE,
            totalPages: 1,
          },
        );
        setMigrationRequired(Boolean(payload.migration_required));
      } catch {
        setComments([]);
        setCommentsMeta({
          total: 0,
          page,
          limit: COMMENTS_PER_PAGE,
          totalPages: 1,
        });
      } finally {
        setCommentsLoading(false);
      }
    },
    [slug, video?.can_watch, video?.allow_comments],
  );

  useEffect(() => {
    setComments([]);
    setCommentsPage(1);
    setExpandedReplies({});
    setMigrationRequired(false);
  }, [slug, video?.id]);

  useEffect(() => {
    if (!video?.can_watch || !video?.allow_comments) return;
    void fetchComments(commentsPage);
  }, [commentsPage, fetchComments, video?.can_watch, video?.allow_comments]);

  useEffect(() => {
    if (!slug || !video?.can_watch) return;
    if (trackedSlugRef.current === slug) return;

    trackedSlugRef.current = slug;

    const trackView = async () => {
      try {
        const response = await fetch(
          `/api/videos/${encodeURIComponent(slug)}/view`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_id: getDeviceId() }),
          },
        );

        if (!response.ok) return;
        const payload = (await response.json()) as { view_count?: number };
        if (typeof payload.view_count === "number") {
          setVideo((current) => {
            if (!current) return current;
            return {
              ...current,
              view_count: payload.view_count ?? current.view_count,
            };
          });
        }
      } catch {
        // Silent tracking failure.
      }
    };

    void trackView();
  }, [slug, video?.can_watch, getDeviceId]);

  const handleLikeVideo = async () => {
    if (!slug || likedVideo || isLikingVideo) return;

    setIsLikingVideo(true);
    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(slug)}/like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: getDeviceId() }),
        },
      );

      const payload = (await response.json()) as LikePayload;
      if (!response.ok) {
        toast.error(payload.error || "Impossible d'aimer cette video.");
        return;
      }

      if (typeof payload.likes === "number") {
        setVideo((current) => {
          if (!current) return current;
          return { ...current, like_count: payload.likes };
        });
      }

      if (payload.liked || payload.already_liked) {
        setLikedVideo(true);
      }
    } catch {
      toast.error("Erreur reseau pendant l'action j'aime.");
    } finally {
      setIsLikingVideo(false);
    }
  };

  const submitComment = async (
    content: string,
    parentId: string | null = null,
  ) => {
    const response = await fetch(
      `/api/videos/${encodeURIComponent(slug)}/commentaires`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parent_id: parentId }),
      },
    );

    const payload = (await response.json()) as CommentPayload;
    if (!response.ok || !payload.data) {
      throw new Error(payload.error || "Impossible d'envoyer le commentaire.");
    }
    return payload;
  };

  const handleSubmitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Vous devez etre connecte pour commenter.");
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed || !slug) return;

    try {
      setIsSubmittingComment(true);
      const payload = await submitComment(trimmed, null);
      if (!payload.data) return;
      setCommentText("");
      setExpandedReplies({});
      if (commentsPage === 1) {
        await fetchComments(1);
      } else {
        setCommentsPage(1);
      }
      toast.success(payload.message || "Commentaire envoye.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur pendant l'envoi.",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user) {
      toast.error("Vous devez etre connecte pour repondre.");
      return;
    }

    const trimmed = replyText.trim();
    if (!trimmed || !slug) return;

    try {
      setIsSubmittingReply(true);
      const payload = await submitComment(trimmed, parentId);
      if (!payload.data) return;
      setReplyText("");
      setReplyTargetId(null);
      setExpandedReplies({});
      if (commentsPage === 1) {
        await fetchComments(1);
      } else {
        setCommentsPage(1);
      }
      toast.success(payload.message || "Reponse envoyee.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur pendant l'envoi.",
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!slug) return;
    if (likedMap[commentId] || likingMap[commentId]) return;

    setLikingMap((current) => ({ ...current, [commentId]: true }));
    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(slug)}/commentaires/${encodeURIComponent(commentId)}/like`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: getDeviceId() }),
        },
      );

      const payload = (await response.json()) as LikePayload;
      if (!response.ok) {
        toast.error(payload.error || "Impossible d'aimer ce commentaire.");
        return;
      }

      if (typeof payload.likes === "number") {
        setComments((current) =>
          current.map((item) =>
            item.id === commentId
              ? { ...item, likes: payload.likes || 0 }
              : item,
          ),
        );
      }

      if (payload.liked || payload.already_liked) {
        setLikedMap((current) => ({ ...current, [commentId]: true }));
      }
    } catch {
      toast.error("Erreur reseau pendant l'action j'aime.");
    } finally {
      setLikingMap((current) => ({ ...current, [commentId]: false }));
    }
  };

  const handleAddToCart = async () => {
    if (!video || video.access_type !== "paid") return;

    if (!user) {
      toast.error("Connectez-vous pour ajouter cette video au panier.");
      router.push("/auth/connexion");
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem({
        item_type: "video",
        item_id: video.id,
        unit_price: Number(video.price || 0),
        quantity: 1,
        item_name: video.title,
        item_image: video.thumbnail_url || "/images/placeholder-video.svg",
      });
      toast.success("Video ajoutee au panier.");
      router.push("/boutique/panier");
    } catch {
      toast.error("Impossible d'ajouter cette video au panier.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const displayedCommentTotal =
    commentsMeta.total || comments.length || Number(video?.comment_count || 0);

  const renderComment = (
    commentItem: VideoCommentNode,
    depth = 0,
  ): ReactNode => {
    const isReplyOpen = replyTargetId === commentItem.id;
    const isLiking = Boolean(likingMap[commentItem.id]);
    const isLiked = Boolean(likedMap[commentItem.id]);
    const hasReplies = commentItem.replies.length > 0;
    const repliesExpanded = Boolean(expandedReplies[commentItem.id]);

    return (
      <motion.div
        key={commentItem.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={
          depth > 0 ? "mt-4 ml-6 border-l-2 border-slate-700/50 pl-4" : ""
        }
      >
        <div className="flex gap-3 rounded-xl border border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-slate-900/30 p-4 shadow-lg shadow-black/10">
          <Avatar className="h-10 w-10 border border-slate-700 ring-2 ring-slate-800">
            <AvatarImage src={commentItem.user?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 text-sm font-semibold">
              {commentItem.user?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-200">
                {commentItem.user?.full_name || "Utilisateur"}
              </span>
              <span className="text-xs text-slate-500">
                {formatDate(commentItem.created_at)}
              </span>
              {commentItem.status !== "approved" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                  En attente
                </span>
              )}
            </div>

            <p className="mb-3 text-sm leading-6 text-slate-300">
              {commentItem.content}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleLikeComment(commentItem.id)}
                disabled={isLiking || isLiked}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-700/50 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Heart
                  className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
                />
                {commentItem.likes}
              </button>

              {user && (
                <button
                  onClick={() => {
                    if (isReplyOpen) {
                      setReplyTargetId(null);
                      setReplyText("");
                    } else {
                      setReplyTargetId(commentItem.id);
                      setReplyText("");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-700/50 hover:text-slate-200"
                >
                  <Reply className="h-4 w-4" />
                  Répondre
                </button>
              )}

              {hasReplies && (
                <button
                  onClick={() =>
                    setExpandedReplies((current) => ({
                      ...current,
                      [commentItem.id]: !repliesExpanded,
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-slate-700/50 hover:text-slate-200"
                >
                  {repliesExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {repliesExpanded
                    ? "Masquer"
                    : `Voir ${commentItem.replies.length}`}
                </button>
              )}
            </div>

            {isReplyOpen && (
              <div className="mt-3 rounded-xl border border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-3">
                <Textarea
                  placeholder="Écrire une réponse..."
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  className="mb-3 border-slate-700/50 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 min-h-[60px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setReplyTargetId(null);
                      setReplyText("");
                    }}
                    className="border-slate-600 bg-slate-800/30 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => handleSubmitReply(commentItem.id)}
                    disabled={!replyText.trim() || isSubmittingReply}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                  >
                    {isSubmittingReply ? "Envoi..." : "Répondre"}
                  </Button>
                </div>
              </div>
            )}

            {hasReplies && repliesExpanded && (
              <div className="mt-3">
                {commentItem.replies.map((reply) =>
                  renderComment(reply, depth + 1),
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="inline-flex items-center gap-2 text-slate-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            Chargement de la vidéo...
          </div>
        </div>
      </div>
    );
  }

  if (!video || errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <Play className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              Vidéo indisponible
            </h1>
            <p className="mt-3 text-slate-400">
              {errorMessage ||
                "Cette vidéo n'est pas disponible pour le moment."}
            </p>
            <Link href="/videos">
              <Button
                variant="outline"
                className="mt-6 border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux vidéos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const youtubeId = video.video_url ? extractYouTubeId(video.video_url) : null;
  const vimeoId = video.video_url ? extractVimeoId(video.video_url) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-20 text-slate-100">
      {/* ── BREADCRUMB HEADER ── */}
      <div className="relative border-b border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-slate-800/60 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href="/videos"
              className="inline-flex items-center gap-2 rounded-full bg-slate-800/50 px-4 py-2 text-sm text-slate-400 transition-all hover:bg-slate-700/50 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux vidéos
            </Link>
          </motion.div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr),380px] lg:px-8">
        {/* ── MAIN VIDEO SECTION ── */}
        <section className="space-y-6">
          {/* Video Player Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 shadow-2xl shadow-black/30"
          >
            <div className="relative aspect-video bg-gradient-to-br from-slate-950 to-slate-900">
              {video.can_watch ? (
                <>
                  {video.video_type === "youtube" && youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                      title={video.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : video.video_type === "vimeo" && vimeoId ? (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`}
                      title={video.title}
                      className="h-full w-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : video.video_url ? (
                    <video
                      controls
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      className="h-full w-full object-contain"
                      src={video.video_url}
                      onContextMenu={(event) => event.preventDefault()}
                      playsInline
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                      Source vidéo indisponible.
                    </div>
                  )}
                </>
              ) : (
                <div className="relative flex h-full items-center justify-center overflow-hidden">
                  <Image
                    src={video.thumbnail_url || "/images/placeholder-video.svg"}
                    alt={video.title}
                    fill
                    className="object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/50 to-slate-900/80" />
                  <div className="relative z-10 max-w-md px-6 text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/30"
                    >
                      <Lock className="h-8 w-8 text-white" />
                    </motion.div>
                    <p className="mb-2 text-xl font-bold text-white">
                      Accès verrouillé
                    </p>
                    <p className="mb-6 text-sm text-slate-300">
                      {accessLabel(video)}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {video.requires_auth && (
                        <Link href="/auth/connexion">
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                          >
                            Se connecter
                          </Button>
                        </Link>
                      )}

                      {video.access_type === "paid" && (
                        <Button
                          size="sm"
                          onClick={handleAddToCart}
                          disabled={isAddingToCart}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {isAddingToCart ? "Ajout..." : "Ajouter au panier"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Video Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 p-6 shadow-xl shadow-black/20"
          >
            {/* Badges */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-500/20 to-red-600/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/20">
                <Sparkles className="h-3.5 w-3.5" />
                Premium
              </span>
              {video.access_type === "public" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  <Globe className="h-3.5 w-3.5" />
                  Public
                </span>
              )}
              {video.access_type === "members" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                  <Users className="h-3.5 w-3.5" />
                  Membres
                </span>
              )}
              {video.access_type === "paid" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-400 border border-red-500/20">
                  <Lock className="h-3.5 w-3.5" />
                  {formatPrice(Number(video.price || 0), "USD")}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              {video.title}
            </h1>

            {/* Stats row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1.5">
                <Eye className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-300">
                  {compact(Number(video.view_count || 0))}
                </span>{" "}
                vues
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                {formatDate(video.created_at)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/50 px-3 py-1.5">
                <MessageCircle className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-300">
                  {displayedCommentTotal}
                </span>{" "}
                commentaire{displayedCommentTotal > 1 ? "s" : ""}
              </span>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLikeVideo}
                  disabled={isLikingVideo || likedVideo || !video.can_watch}
                  className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-red-500/50"
                >
                  <Heart
                    className={`mr-2 h-4 w-4 ${likedVideo ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {compact(Number(video.like_count || 0))} j&apos;aime
                </Button>
              </motion.div>

              <ShareButton
                title={video.title}
                text={video.description || "Regardez cette vidéo"}
                path={`/videos/${video.slug}`}
                size="sm"
                variant="outline"
                className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
              />

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    commentsRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Commenter
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Description Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 p-6 shadow-xl shadow-black/20"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              Description
            </h2>
            <div className="mt-4 prose prose-invert max-w-none">
              <p className="whitespace-pre-line text-sm leading-7 text-slate-300">
                {video.description || "Aucune description disponible."}
              </p>
            </div>
          </motion.div>

          {video.allow_comments && video.can_watch && (
            <motion.div
              ref={commentsRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 p-6 shadow-xl shadow-black/20"
            >
              <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                  <MessageCircle className="h-5 w-5 text-white" />
                </span>
                Commentaires ({displayedCommentTotal})
              </h2>

              {migrationRequired && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-900/10 p-4 text-sm text-red-400">
                  Structure SQL des commentaires vidéo non active. Appliquez la
                  migration `015_video_social_features.sql`.
                </div>
              )}

              <form
                onSubmit={handleSubmitComment}
                className="mt-6 rounded-xl border border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-4"
              >
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 border border-slate-700 ring-2 ring-slate-800">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300">
                      {user?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder={
                        user
                          ? "Ajouter un commentaire..."
                          : "Connectez-vous pour commenter..."
                      }
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      disabled={!user || migrationRequired}
                      className="border-slate-700/50 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 min-h-[80px]"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="submit"
                        disabled={
                          !user ||
                          !commentText.trim() ||
                          isSubmittingComment ||
                          migrationRequired
                        }
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {isSubmittingComment ? "Envoi..." : "Publier"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {commentsLoading ? (
                <div className="mt-6 flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                </div>
              ) : commentTree.length === 0 ? (
                <div className="mt-6 rounded-xl border border-slate-700/30 bg-slate-800/20 p-8 text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">
                    Aucun commentaire pour le moment. Soyez le premier à
                    commenter !
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {commentTree.map((comment) => renderComment(comment))}
                </div>
              )}

              {commentsMeta.totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-4">
                  <p className="text-sm text-slate-400">
                    Page{" "}
                    <span className="font-semibold text-slate-200">
                      {commentsMeta.page}
                    </span>{" "}
                    / {commentsMeta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={commentsPage <= 1 || commentsLoading}
                      onClick={() => {
                        setExpandedReplies({});
                        setCommentsPage((current) => Math.max(1, current - 1));
                      }}
                      className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        commentsPage >= commentsMeta.totalPages ||
                        commentsLoading
                      }
                      onClick={() => {
                        setExpandedReplies({});
                        setCommentsPage((current) =>
                          Math.min(commentsMeta.totalPages, current + 1),
                        );
                      }}
                      className="border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </section>

        <aside className="space-y-6">
          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 p-5 shadow-xl shadow-black/10"
          >
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              Infos vidéo
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
                <span className="text-slate-400">Type</span>
                <span className="font-medium text-slate-200 capitalize">
                  {video.video_type}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
                <span className="text-slate-400">Accès</span>
                <span className="font-medium text-slate-200">
                  {accessLabel(video)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
                <span className="text-slate-400">J&apos;aime</span>
                <span className="font-medium text-red-400">
                  {compact(Number(video.like_count || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/30 px-3 py-2">
                <span className="text-slate-400">Commentaires</span>
                <span className="font-medium text-slate-200">
                  {displayedCommentTotal}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Related Videos Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 p-5 shadow-xl shadow-black/10"
          >
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                <Play className="h-4 w-4 text-white" />
              </span>
              Vidéos similaires
            </h3>
            {related.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucune vidéo similaire disponible.
              </p>
            ) : (
              <div className="space-y-3">
                {related.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Link
                      href={`/videos/${item.slug}`}
                      className="group flex gap-3 rounded-xl border border-slate-700/30 bg-slate-800/20 p-2 transition-all hover:border-red-500/30 hover:bg-slate-800/40"
                    >
                      <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
                        <Image
                          src={
                            item.thumbnail_url ||
                            "/images/placeholder-video.svg"
                          }
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <p className="line-clamp-2 text-sm font-medium text-slate-200 transition-colors group-hover:text-red-400">
                          {item.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Eye className="h-3 w-3" />
                          {compact(Number(item.view_count || 0))} vues
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </aside>
      </main>
    </div>
  );
}
