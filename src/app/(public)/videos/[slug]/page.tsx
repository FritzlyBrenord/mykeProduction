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
  Heart,
  Lock,
  MessageCircle,
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
        className={depth > 0 ? "mt-4 ml-6 border-l border-border pl-4" : ""}
      >
        <div className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={commentItem.user?.avatar_url || undefined} />
            <AvatarFallback>
              {commentItem.user?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {commentItem.user?.full_name || "Utilisateur"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(commentItem.created_at)}
              </span>
              {commentItem.status !== "approved" && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wide"
                >
                  En attente
                </Badge>
              )}
            </div>

            <p className="mb-2 text-sm leading-6 text-muted-foreground">
              {commentItem.content}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleLikeComment(commentItem.id)}
                disabled={isLiking || isLiked}
              >
                <Heart className="mr-1 h-4 w-4" />
                {commentItem.likes}
              </Button>

              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    if (isReplyOpen) {
                      setReplyTargetId(null);
                      setReplyText("");
                    } else {
                      setReplyTargetId(commentItem.id);
                      setReplyText("");
                    }
                  }}
                >
                  <Reply className="mr-1 h-4 w-4" />
                  Repondre
                </Button>
              )}

              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() =>
                    setExpandedReplies((current) => ({
                      ...current,
                      [commentItem.id]: !repliesExpanded,
                    }))
                  }
                >
                  {repliesExpanded ? (
                    <ChevronDown className="mr-1 h-4 w-4" />
                  ) : (
                    <ChevronRight className="mr-1 h-4 w-4" />
                  )}
                  {repliesExpanded
                    ? "Masquer"
                    : `Voir ${commentItem.replies.length}`}
                </Button>
              )}
            </div>

            {isReplyOpen && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
                <Textarea
                  placeholder="Ecrire une reponse..."
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  className="mb-2"
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
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => handleSubmitReply(commentItem.id)}
                    disabled={!replyText.trim() || isSubmittingReply}
                  >
                    {isSubmittingReply ? "Envoi..." : "Repondre"}
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
      <div className="min-h-screen bg-background pt-28">
        <div className="mx-auto max-w-6xl px-4 text-center text-muted-foreground">
          Chargement de la video...
        </div>
      </div>
    );
  }

  if (!video || errorMessage) {
    return (
      <div className="min-h-screen bg-background pt-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Video indisponible
          </h1>
          <p className="mt-2 text-muted-foreground">
            {errorMessage || "Cette video n'est pas disponible pour le moment."}
          </p>
          <Link href="/videos">
            <Button variant="outline" className="mt-5">
              Retour aux videos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const youtubeId = video.video_url ? extractYouTubeId(video.video_url) : null;
  const vimeoId = video.video_url ? extractVimeoId(video.video_url) : null;

  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/videos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux videos
          </Link>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr),360px] lg:px-8">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative aspect-video bg-black">
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
                      Votre navigateur ne supporte pas la lecture video.
                    </video>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                      Source video indisponible.
                    </div>
                  )}
                </>
              ) : (
                <div className="relative flex h-full items-center justify-center overflow-hidden">
                  <Image
                    src={video.thumbnail_url || "/images/placeholder-video.svg"}
                    alt={video.title}
                    fill
                    className="object-cover opacity-35"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="relative z-10 max-w-md px-6 text-center text-white">
                    <Lock className="mx-auto mb-3 h-10 w-10 text-amber-300" />
                    <p className="mb-2 text-xl font-semibold">
                      Acces verrouille
                    </p>
                    <p className="mb-4 text-sm text-white/80">
                      {accessLabel(video)}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {video.requires_auth && (
                        <Link href="/auth/connexion">
                          <Button
                            size="sm"
                            className="bg-white text-black hover:bg-white/90"
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
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500 text-black hover:bg-amber-500">
                <Sparkles className="mr-1 h-3 w-3" />
                Detail premium
              </Badge>
              {video.access_type === "public" && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  Public
                </Badge>
              )}
              {video.access_type === "members" && (
                <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                  <Users className="mr-1 h-3 w-3" />
                  Membres
                </Badge>
              )}
              {video.access_type === "paid" && (
                <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                  {formatPrice(Number(video.price || 0), "USD")}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-semibold sm:text-3xl">
              {video.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {compact(Number(video.view_count || 0))} vues
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Publiee le {formatDate(video.created_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {displayedCommentTotal} commentaire
                {displayedCommentTotal > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLikeVideo}
                disabled={isLikingVideo || likedVideo || !video.can_watch}
              >
                <Heart className="mr-2 h-4 w-4" />
                {Number(video.like_count || 0)} j&apos;aime
              </Button>

              <ShareButton
                title={video.title}
                text={video.description || "Regardez cette video"}
                path={`/videos/${video.slug}`}
                size="sm"
                variant="outline"
                className="text-black"
              />

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
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Commenter
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {video.description || "Aucune description disponible."}
            </p>
          </div>

          {video.allow_comments && video.can_watch && (
            <div
              ref={commentsRef}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <h2 className="text-xl font-semibold">
                Commentaires ({displayedCommentTotal})
              </h2>

              {migrationRequired && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                  Structure SQL des commentaires video non active. Appliquez la
                  migration `015_video_social_features.sql`.
                </div>
              )}

              <form
                onSubmit={handleSubmitComment}
                className="mt-5 rounded-xl border border-border bg-background/40 p-4"
              >
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback>
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
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={
                          !user ||
                          !commentText.trim() ||
                          isSubmittingComment ||
                          migrationRequired
                        }
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {isSubmittingComment ? "Envoi..." : "Publier"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {commentsLoading ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Chargement des commentaires...
                </p>
              ) : commentTree.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  Aucun commentaire pour le moment.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {commentTree.map((comment) => renderComment(comment))}
                </div>
              )}

              {commentsMeta.totalPages > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {commentsMeta.page} sur {commentsMeta.totalPages}
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
                    >
                      Precedent
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
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold">Infos video</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Type:</span>{" "}
                {video.video_type}
              </p>
              <p>
                <span className="font-medium text-foreground">Acces:</span>{" "}
                {accessLabel(video)}
              </p>
              <p>
                <span className="font-medium text-foreground">Likes:</span>{" "}
                {compact(Number(video.like_count || 0))}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Commentaires:
                </span>{" "}
                {displayedCommentTotal}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold">Videos similaires</h3>
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune video similaire disponible.
              </p>
            ) : (
              <div className="space-y-3">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/videos/${item.slug}`}
                    className="group flex gap-3 rounded-xl border border-border bg-background/30 p-2 transition hover:bg-background/70"
                  >
                    <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={
                          item.thumbnail_url || "/images/placeholder-video.svg"
                        }
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {compact(Number(item.view_count || 0))} vues
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
