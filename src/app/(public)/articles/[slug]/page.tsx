"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  MessageCircle,
  Reply,
  Send,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/share/ShareButton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/useAuth";
import { Article } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

type PublicArticle = Article & {
  categories?: string[];
  comment_count?: number;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type PublicComment = {
  id: string;
  user_id: string;
  article_id: string | null;
  formation_id: string | null;
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

type PublicCommentNode = PublicComment & {
  replies: PublicCommentNode[];
};

type CommentPayload = {
  error?: string;
  message?: string;
  data?: PublicComment;
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
  data: PublicComment[];
  meta: CommentsMeta;
};

const DEVICE_ID_STORAGE_KEY = "myke_device_id";
const COMMENTS_PER_PAGE = 10;
const editorialTitleClass = "font-[family-name:var(--font-playfair)]";

function buildCommentTree(input: PublicComment[]): PublicCommentNode[] {
  const sorted = [...input].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const byId = new Map<string, PublicCommentNode>();
  sorted.forEach((comment) => {
    byId.set(comment.id, {
      ...comment,
      replies: [],
    });
  });

  const roots: PublicCommentNode[] = [];

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

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [article, setArticle] = useState<PublicArticle | null>(null);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsMeta, setCommentsMeta] = useState<CommentsMeta>({
    total: 0,
    page: 1,
    limit: COMMENTS_PER_PAGE,
    totalPages: 1,
  });
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [likingMap, setLikingMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<
    Record<string, boolean>
  >({});

  const trackedSlugRef = useRef<string | null>(null);
  const articleContentRef = useRef<HTMLElement | null>(null);

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

    const fetchArticle = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setErrorMessage(null);

        const articleResponse = await fetch(
          `/api/articles/${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!articleResponse.ok) {
          if (articleResponse.status === 404) {
            throw new Error("Article introuvable.");
          }
          throw new Error("Impossible de charger l'article.");
        }

        const articleData = (await articleResponse.json()) as PublicArticle;

        if (!active) return;
        setArticle(articleData);
      } catch (error) {
        if (!active) return;
        setArticle(null);
        setComments([]);
        setCommentsMeta({
          total: 0,
          page: 1,
          limit: COMMENTS_PER_PAGE,
          totalPages: 1,
        });
        setErrorMessage(
          error instanceof Error ? error.message : "Erreur de chargement.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchArticle();

    return () => {
      active = false;
    };
  }, [slug]);

  const fetchComments = useCallback(
    async (page: number) => {
      if (!slug) return;

      try {
        setCommentsLoading(true);

        const response = await fetch(
          `/api/articles/${encodeURIComponent(slug)}/commentaires?page=${page}&limit=${COMMENTS_PER_PAGE}`,
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
          | PublicComment[];

        if (Array.isArray(payload)) {
          setComments(payload);
          setCommentsMeta({
            total: payload.length,
            page: 1,
            limit: payload.length || COMMENTS_PER_PAGE,
            totalPages: 1,
          });
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
    [slug],
  );

  useEffect(() => {
    if (!slug) return;
    setCommentsPage(1);
    setExpandedReplies({});
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetchComments(commentsPage);
  }, [slug, commentsPage, user?.id, fetchComments]);

  useEffect(() => {
    if (!slug) return;
    if (trackedSlugRef.current === slug) return;

    trackedSlugRef.current = slug;

    const trackView = async () => {
      try {
        const response = await fetch(
          `/api/articles/${encodeURIComponent(slug)}/view`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_id: getDeviceId() }),
          },
        );

        if (!response.ok) return;

        const payload = (await response.json()) as { view_count?: number };
        if (typeof payload.view_count === "number") {
          setArticle((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              view_count: payload.view_count ?? prev.view_count,
            };
          });
        }
      } catch {
        // Silent fail for tracking.
      }
    };

    trackView();
  }, [slug, getDeviceId]);

  useEffect(() => {
    const root = articleContentRef.current;
    if (!root) return;

    root.querySelectorAll("table").forEach((table) => {
      if (table.parentElement?.classList.contains("article-table-wrap")) return;

      const wrapper = document.createElement("div");
      wrapper.className =
        "article-table-wrap my-6 w-full overflow-x-auto rounded-xl border border-amber-200/70 bg-white";

      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      table.classList.add("w-full", "min-w-[680px]", "border-collapse");

      table.querySelectorAll("th").forEach((th) => {
        th.classList.add(
          "border",
          "border-amber-200/70",
          "bg-amber-50/80",
          "px-3",
          "py-2",
          "text-left",
          "text-sm",
          "font-semibold",
          "text-slate-900",
        );
      });

      table.querySelectorAll("td").forEach((td) => {
        td.classList.add(
          "border",
          "border-amber-200/70",
          "px-3",
          "py-2",
          "align-top",
          "text-sm",
          "text-slate-700",
        );
      });
    });

    root.querySelectorAll("iframe").forEach((iframe) => {
      if (iframe.parentElement?.classList.contains("article-media-wrap"))
        return;

      const wrapper = document.createElement("div");
      wrapper.className =
        "article-media-wrap my-8 aspect-video w-full overflow-hidden rounded-xl border border-amber-200/70 bg-black shadow-md";

      iframe.parentNode?.insertBefore(wrapper, iframe);
      wrapper.appendChild(iframe);

      iframe.removeAttribute("width");
      iframe.removeAttribute("height");
      iframe.classList.add("h-full", "w-full");
      if (!iframe.getAttribute("loading")) {
        iframe.setAttribute("loading", "lazy");
      }
    });

    root.querySelectorAll("video").forEach((video) => {
      video.classList.add(
        "my-8",
        "w-full",
        "h-auto",
        "rounded-xl",
        "border",
        "border-amber-200/70",
        "bg-black",
      );
    });
  }, [article?.content]);

  const submitComment = async (
    content: string,
    parentId: string | null = null,
  ) => {
    const response = await fetch(
      `/api/articles/${encodeURIComponent(slug)}/commentaires`,
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

    const trimmed = comment.trim();
    if (!trimmed || !slug) return;

    try {
      setIsSubmitting(true);

      const payload = await submitComment(trimmed, null);
      if (!payload.data) return;

      setComment("");
      setExpandedReplies({});
      if (commentsPage === 1) {
        await fetchComments(1);
      } else {
        setCommentsPage(1);
      }
      toast.success(payload.message || "Commentaire envoye.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur reseau pendant l'envoi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user) {
      toast.error("Vous devez etre connecte pour repondre.");
      return;
    }

    const trimmed = replyComment.trim();
    if (!trimmed || !slug) return;

    try {
      setIsSubmittingReply(true);

      const payload = await submitComment(trimmed, parentId);
      if (!payload.data) return;

      setReplyComment("");
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
        error instanceof Error
          ? error.message
          : "Erreur reseau pendant l'envoi.",
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!slug) return;
    if (likedMap[commentId]) return;
    if (likingMap[commentId]) return;

    setLikingMap((prev) => ({ ...prev, [commentId]: true }));

    try {
      const response = await fetch(
        `/api/articles/${encodeURIComponent(slug)}/commentaires/${encodeURIComponent(commentId)}/like`,
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
        setComments((prev) =>
          prev.map((item) =>
            item.id === commentId ? { ...item, likes: payload.likes } : item,
          ),
        );
      }

      if (payload.liked || payload.already_liked) {
        setLikedMap((prev) => ({ ...prev, [commentId]: true }));
      }
    } catch {
      toast.error("Erreur reseau pendant l'action j'aime.");
    } finally {
      setLikingMap((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const displayedCommentTotal = commentsMeta.total || comments.length;

  const renderComment = (
    commentItem: PublicCommentNode,
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
          depth > 0 ? "mt-4 ml-6 border-l border-amber-200/70 pl-4" : ""
        }
      >
        <div className="flex gap-3 rounded-xl border border-amber-200/60 bg-white/85 p-4 shadow-sm">
          <Avatar className="h-10 w-10 flex-shrink-0 border border-amber-200/70">
            <AvatarImage src={commentItem.user?.avatar_url || undefined} />
            <AvatarFallback className="bg-amber-100 text-amber-900">
              {commentItem.user?.full_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">
                {commentItem.user?.full_name || "Utilisateur"}
              </span>
              <span className="text-xs text-slate-500">
                {formatDate(commentItem.created_at)}
              </span>
              {commentItem.status !== "approved" && (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wide"
                >
                  En attente de validation
                </Badge>
              )}
            </div>

            <p
              className="mb-2 text-slate-700"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {commentItem.content}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-600 hover:text-slate-900"
                onClick={() => handleLikeComment(commentItem.id)}
                disabled={isLiking || isLiked}
              >
                <ThumbsUp className="mr-1 h-4 w-4" />
                {commentItem.likes}
              </Button>

              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-600 hover:text-slate-900"
                  onClick={() => {
                    if (isReplyOpen) {
                      setReplyTargetId(null);
                      setReplyComment("");
                    } else {
                      setReplyTargetId(commentItem.id);
                      setReplyComment("");
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
                  className="h-8 px-2 text-slate-600 hover:text-slate-900"
                  onClick={() =>
                    setExpandedReplies((prev) => ({
                      ...prev,
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
                    ? "Masquer les reponses"
                    : `Voir ${commentItem.replies.length} reponse${commentItem.replies.length > 1 ? "s" : ""}`}
                </Button>
              )}
            </div>

            {isReplyOpen && (
              <div className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3">
                <Textarea
                  placeholder="Ecrire une reponse..."
                  value={replyComment}
                  onChange={(e) => setReplyComment(e.target.value)}
                  className="mb-2 border-amber-200"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setReplyTargetId(null);
                      setReplyComment("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => handleSubmitReply(commentItem.id)}
                    disabled={!replyComment.trim() || isSubmittingReply}
                    className="bg-slate-900 text-amber-100 hover:bg-slate-800"
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
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8f3e8_0%,#fcfaf5_35%,#ffffff_100%)] pt-28">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center text-slate-500 sm:px-6 lg:px-8">
          Chargement de l&apos;article...
        </div>
      </div>
    );
  }

  if (!article || errorMessage) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8f3e8_0%,#fcfaf5_35%,#ffffff_100%)] pt-28">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <h1
            className={`${editorialTitleClass} text-3xl font-semibold text-slate-900`}
          >
            Article indisponible
          </h1>
          <p className="mt-3 text-slate-500">
            {errorMessage || "Cet article n'est pas disponible pour le moment."}
          </p>
          <Link href="/articles">
            <Button variant="outline" className="mt-5">
              Retour aux articles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f3e8_0%,#fcfaf5_35%,#ffffff_100%)] pt-24">
      <section className="relative overflow-hidden border-b border-amber-200/60">
        <div className="pointer-events-none absolute -left-20 top-8 h-52 w-52 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-10 h-36 w-36 rounded-full border border-amber-300/40" />

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/articles"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux articles
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr),260px]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-4 py-1 text-xs uppercase tracking-[0.22em] text-amber-900">
                <Sparkles className="h-3.5 w-3.5" />
                Edition Premium
              </div>

              {article.category?.name && (
                <Badge className="mb-4 bg-amber-100 text-amber-900 hover:bg-amber-100">
                  {article.category.name}
                </Badge>
              )}

              <h1
                className={`${editorialTitleClass} text-4xl font-semibold leading-tight text-slate-900 md:text-5xl`}
              >
                {article.title}
              </h1>

              {article.excerpt && (
                <p
                  className="mt-5 text-xl leading-relaxed text-slate-600"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {article.excerpt}
                </p>
              )}
            </div>

            <aside className="rounded-2xl border border-amber-200/70 bg-white/85 p-4 shadow-lg shadow-amber-950/5 backdrop-blur">
              <div className="space-y-3 text-sm text-slate-600">
                {article.author && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border border-amber-200/70">
                      <AvatarImage
                        src={article.author.avatar_url || undefined}
                      />
                      <AvatarFallback className="bg-amber-100 text-amber-900 text-xs">
                        {article.author.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-slate-900">
                      {article.author.full_name}
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-700" />
                  {formatDate(article.published_at || article.created_at)}
                </div>

                {article.reading_time && (
                  <div className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-700" />
                    {article.reading_time} min de lecture
                  </div>
                )}

                <div className="inline-flex items-center gap-2">
                  <Eye className="h-4 w-4 text-amber-700" />
                  {article.view_count || 0} vue
                  {(article.view_count || 0) > 1 ? "s" : ""}
                </div>

                <div className="inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-amber-700" />
                  {displayedCommentTotal} commentaire
                  {displayedCommentTotal > 1 ? "s" : ""}
                </div>
              </div>

              <div className="mt-5 border-t border-amber-200/70 pt-4">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Partager
                </p>
                <div className="flex items-center gap-2">
                  <ShareButton
                    title={article.title}
                    text={article.excerpt || "Decouvrez cet article"}
                    path={`/articles/${article.slug}`}
                    size="sm"
                    variant="outline"
                    className="text-black"
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-xl shadow-amber-950/10"
        >
          <div className="relative aspect-[16/8]">
            <Image
              src={article.thumbnail_url || "/images/placeholder-article.svg"}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.article
          ref={articleContentRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-amber-200/70 bg-white/90 p-6 shadow-lg shadow-amber-950/5 md:p-10
                     [&_h2]:font-[family-name:var(--font-playfair)] [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-10 [&_h2]:mb-4
                     [&_h3]:font-[family-name:var(--font-playfair)] [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-8 [&_h3]:mb-3
                     [&_p]:text-slate-700 [&_p]:leading-8 [&_p]:mb-5
                     [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:mb-5
                     [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:mb-5
                     [&_li]:text-slate-700
                     [&_a]:text-amber-800 [&_a]:underline
                     [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </section>

      {article.allow_comments && (
        <section className="border-t border-amber-200/60 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <h2
              className={`${editorialTitleClass} text-3xl font-semibold text-slate-900`}
            >
              Commentaires ({displayedCommentTotal})
            </h2>

            <form
              onSubmit={handleSubmitComment}
              className="mt-6 rounded-2xl border border-amber-200/70 bg-white p-4 shadow-sm md:p-5"
            >
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0 border border-amber-200/70">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-amber-100 text-amber-900">
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
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mb-2 border-amber-200"
                    disabled={!user}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={!user || !comment.trim() || isSubmitting}
                      className="bg-slate-900 text-amber-100 hover:bg-slate-800"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Envoi..." : "Publier"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {commentsLoading ? (
              <p className="mt-6 text-sm text-slate-500">
                Chargement des commentaires...
              </p>
            ) : commentTree.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                Aucun commentaire pour le moment.
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                {commentTree.map((commentItem) => renderComment(commentItem))}
              </div>
            )}

            {commentsMeta.totalPages > 1 && (
              <div className="mt-8 flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Page {commentsMeta.page} sur {commentsMeta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={commentsPage <= 1 || commentsLoading}
                    onClick={() => {
                      setExpandedReplies({});
                      setCommentsPage((prev) => Math.max(1, prev - 1));
                    }}
                  >
                    Precedent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      commentsPage >= commentsMeta.totalPages || commentsLoading
                    }
                    onClick={() => {
                      setExpandedReplies({});
                      setCommentsPage((prev) =>
                        Math.min(commentsMeta.totalPages, prev + 1),
                      );
                    }}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
