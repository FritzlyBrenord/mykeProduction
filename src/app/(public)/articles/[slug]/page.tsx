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

function buildCommentTree(input: PublicComment[]): PublicCommentNode[] {
  const sorted = [...input].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const byId = new Map<string, PublicCommentNode>();
  sorted.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: PublicCommentNode[] = [];
  sorted.forEach((c) => {
    const node = byId.get(c.id);
    if (!node) return;
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)?.replies.push(node);
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
          { method: "GET", cache: "no-store" },
        );
        if (!articleResponse.ok) {
          throw new Error(
            articleResponse.status === 404
              ? "Article introuvable."
              : "Impossible de charger l'article.",
          );
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
          { method: "GET", cache: "no-store" },
        );
        if (!response.ok)
          throw new Error("Impossible de charger les commentaires.");
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
          setArticle((prev) =>
            prev
              ? { ...prev, view_count: payload.view_count ?? prev.view_count }
              : prev,
          );
        }
      } catch {
        /* silent */
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
        "article-table-wrap my-6 w-full overflow-x-auto rounded-xl border border-stone-200 bg-white";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      table.classList.add("w-full", "min-w-[680px]", "border-collapse");
      table.querySelectorAll("th").forEach((th) => {
        th.classList.add(
          "border",
          "border-stone-200",
          "bg-stone-50",
          "px-4",
          "py-2.5",
          "text-left",
          "text-sm",
          "font-semibold",
          "text-stone-900",
        );
      });
      table.querySelectorAll("td").forEach((td) => {
        td.classList.add(
          "border",
          "border-stone-100",
          "px-4",
          "py-2.5",
          "align-top",
          "text-sm",
          "text-stone-700",
        );
      });
    });

    root.querySelectorAll("iframe").forEach((iframe) => {
      if (iframe.parentElement?.classList.contains("article-media-wrap"))
        return;
      const wrapper = document.createElement("div");
      wrapper.className =
        "article-media-wrap my-8 aspect-video w-full overflow-hidden rounded-xl border border-stone-200 bg-black shadow-md";
      iframe.parentNode?.insertBefore(wrapper, iframe);
      wrapper.appendChild(iframe);
      iframe.removeAttribute("width");
      iframe.removeAttribute("height");
      iframe.classList.add("h-full", "w-full");
      if (!iframe.getAttribute("loading"))
        iframe.setAttribute("loading", "lazy");
    });

    root.querySelectorAll("video").forEach((video) => {
      video.classList.add(
        "my-8",
        "w-full",
        "h-auto",
        "rounded-xl",
        "border",
        "border-stone-200",
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
      toast.error("Vous devez être connecté pour commenter.");
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
      if (commentsPage === 1) await fetchComments(1);
      else setCommentsPage(1);
      toast.success(payload.message || "Commentaire envoyé.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur réseau pendant l'envoi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour répondre.");
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
      if (commentsPage === 1) await fetchComments(1);
      else setCommentsPage(1);
      toast.success(payload.message || "Réponse envoyée.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur réseau pendant l'envoi.",
      );
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!slug || likedMap[commentId] || likingMap[commentId]) return;
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
        const nextLikes = payload.likes;
        setComments((prev) =>
          prev.map((item) =>
            item.id === commentId ? { ...item, likes: nextLikes } : item,
          ),
        );
      }
      if (payload.liked || payload.already_liked) {
        setLikedMap((prev) => ({ ...prev, [commentId]: true }));
      }
    } catch {
      toast.error("Erreur réseau pendant l'action j'aime.");
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={
          depth > 0 ? "ml-8 mt-3 border-l border-neutral-200 pl-4" : ""
        }
      >
        <div
          className={`border bg-white p-4 transition-shadow hover:shadow-sm ${depth === 0 ? "border-neutral-200" : "border-neutral-100"}`}
        >
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0 border border-neutral-200">
              <AvatarImage src={commentItem.user?.avatar_url || undefined} />
              <AvatarFallback className="bg-black text-white text-xs font-bold">
                {commentItem.user?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-black">
                  {commentItem.user?.full_name || "Utilisateur"}
                </span>
                <span className="text-xs text-neutral-400">
                  {formatDate(commentItem.created_at)}
                </span>
                {commentItem.status !== "approved" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wide text-[#c9a961] border-[#c9a961]/30"
                  >
                    En attente de validation
                  </Badge>
                )}
              </div>
              <p
                className="text-sm leading-7 text-neutral-700"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {commentItem.content}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <button
                  onClick={() => handleLikeComment(commentItem.id)}
                  disabled={isLiking || isLiked}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-all ${
                    isLiked
                      ? "bg-[#c9a961]/10 text-[#c9a961]"
                      : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  } disabled:opacity-60`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {commentItem.likes > 0 ? commentItem.likes : "J'aime"}
                </button>
                {user && (
                  <button
                    onClick={() => {
                      if (isReplyOpen) {
                        setReplyTargetId(null);
                        setReplyComment("");
                      } else {
                        setReplyTargetId(commentItem.id);
                        setReplyComment("");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Répondre
                  </button>
                )}
                {hasReplies && (
                  <button
                    onClick={() =>
                      setExpandedReplies((prev) => ({
                        ...prev,
                        [commentItem.id]: !repliesExpanded,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-400 transition-all hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    {repliesExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {repliesExpanded
                      ? "Masquer"
                      : `${commentItem.replies.length} réponse${commentItem.replies.length > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>

              {isReplyOpen && (
                <div className="mt-4 border border-neutral-200 bg-[#fafaf9] p-4">
                  <Textarea
                    placeholder="Écrire une réponse…"
                    value={replyComment}
                    onChange={(e) => setReplyComment(e.target.value)}
                    className="mb-3 border-neutral-200 bg-white text-black text-sm resize-none focus:border-[#c9a961]"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyTargetId(null);
                        setReplyComment("");
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitReply(commentItem.id)}
                      disabled={!replyComment.trim() || isSubmittingReply}
                      className="bg-black text-white hover:bg-neutral-800"
                    >
                      {isSubmittingReply ? "Envoi…" : "Répondre"}
                    </Button>
                  </div>
                </div>
              )}

              {hasReplies && repliesExpanded && (
                <div className="mt-3 space-y-3">
                  {commentItem.replies.map((reply) =>
                    renderComment(reply, depth + 1),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9]">
        {/* Masthead skeleton */}
        <header className="border-b-2 border-black bg-white">
          <div className="mx-auto max-w-[1400px] px-6 py-6 text-center lg:px-12">
            <div className="mx-auto h-6 w-48 animate-pulse bg-neutral-200" />
          </div>
        </header>
        <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-12">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 h-4 w-32 animate-pulse bg-neutral-200" />
            <div className="mb-4 h-12 w-3/4 animate-pulse bg-neutral-200" />
            <div className="mb-8 h-6 w-1/2 animate-pulse bg-neutral-200" />
            <div className="h-[400px] animate-pulse bg-neutral-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!article || errorMessage) {
    return (
      <div className="min-h-screen bg-[#fafaf9]">
        {/* Masthead */}
        <header className="border-b-2 border-black bg-white">
          <div className="mx-auto max-w-[1400px] px-6 py-6 text-center lg:px-12">
            <Link
              href="/articles"
              className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-black"
            >
              LE JOURNAL
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-[1400px] px-6 py-20 text-center lg:px-12">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-black">
            Article indisponible
          </h1>
          <p className="mt-4 text-neutral-500">
            {errorMessage || "Cet article n'est pas disponible pour le moment."}
          </p>
          <Link href="/articles">
            <Button
              variant="outline"
              className="mt-6 border-black hover:bg-black hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux articles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* ===== MAGAZINE MASTHEAD ===== */}
      <header className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="flex items-center justify-between py-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            <Link
              href="/articles"
              className="flex items-center gap-2 transition-colors hover:text-black"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au journal
            </Link>
            <span>Myke Industrie Magazine · {new Date().getFullYear()}</span>
            <span>
              N° {String(new Date().getMonth() + 1).padStart(2, "0")}
              {new Date().getFullYear() % 100}
            </span>
          </div>

          {/* Centered masthead */}
          <div className="border-t border-neutral-200 py-6 text-center">
            <div className="mb-2 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-black" />
              <div className="h-1.5 w-1.5 rotate-45 bg-[#c9a961]" />
              <div className="h-px w-16 bg-black" />
            </div>
            <Link
              href="/articles"
              className="font-[family-name:var(--font-playfair)] text-2xl font-bold tracking-tight text-black hover:text-neutral-700"
            >
              LE JOURNAL
            </Link>
          </div>
        </div>
      </header>

      {/* ===== ARTICLE HEADER ===== */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            {/* Category */}
            {article.category?.name && (
              <div className="mb-6">
                <span className="inline-block bg-[#c9a961] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                  {article.category.name}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold leading-tight text-black sm:text-4xl md:text-5xl lg:text-6xl">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p
                className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {article.excerpt}
              </p>
            )}

            {/* Divider */}
            <div className="mx-auto mt-8 flex max-w-xs items-center justify-center gap-3">
              <div className="h-px flex-1 bg-neutral-300" />
              <div className="h-2 w-2 rotate-45 bg-[#c9a961]" />
              <div className="h-px flex-1 bg-neutral-300" />
            </div>

            {/* Meta info bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] uppercase tracking-wider text-neutral-500">
              {article.author && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border border-neutral-200">
                    <AvatarImage src={article.author.avatar_url || undefined} />
                    <AvatarFallback className="bg-black text-white text-[10px] font-bold">
                      {article.author.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-black">
                    {article.author.full_name}
                  </span>
                </div>
              )}
              <div className="hidden h-4 w-px bg-neutral-300 sm:block" />
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(article.published_at || article.created_at)}
              </div>
              {article.reading_time && (
                <>
                  <div className="hidden h-4 w-px bg-neutral-300 sm:block" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {article.reading_time} min de lecture
                  </div>
                </>
              )}
              <div className="hidden h-4 w-px bg-neutral-300 sm:block" />
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {article.view_count || 0} vues
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HERO IMAGE ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="border-b border-neutral-200 bg-white"
      >
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="relative aspect-[21/9] overflow-hidden bg-neutral-100">
            <Image
              src={article.thumbnail_url || "/images/placeholder-article.svg"}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </motion.div>

      {/* ===== ARTICLE CONTENT ===== */}
      <div className="bg-[#fafaf9] py-16">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1fr,280px]">
            {/* Main content */}
            <motion.article
              ref={articleContentRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-white p-8 shadow-sm md:p-12 lg:p-16
                         [&_h2]:font-[family-name:var(--font-playfair)] [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-black [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-neutral-200
                         [&_h3]:font-[family-name:var(--font-playfair)] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-black [&_h3]:mt-8 [&_h3]:mb-3
                         [&_p]:text-neutral-700 [&_p]:leading-[1.9] [&_p]:mb-6 [&_p]:text-[1.0625rem]
                         [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:mb-6 [&_ul]:text-neutral-700
                         [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2 [&_ol]:mb-6 [&_ol]:text-neutral-700
                         [&_li]:leading-7
                         [&_a]:text-[#c9a961] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-black
                         [&_blockquote]:relative [&_blockquote]:border-l-4 [&_blockquote]:border-[#c9a961] [&_blockquote]:pl-6 [&_blockquote]:my-10 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-neutral-600 [&_blockquote]:text-xl [&_blockquote]:leading-relaxed
                         [&_strong]:text-black [&_strong]:font-semibold
                         [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-neutral-800 [&_code]:font-mono
                         [&_pre]:rounded [&_pre]:bg-neutral-900 [&_pre]:p-5 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre>code]:bg-transparent [&_pre>code]:text-neutral-200 [&_pre>code]:p-0
                         [&_img]:w-full [&_img]:my-8 [&_img]:border [&_img]:border-neutral-200"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "1.0625rem",
              }}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Share card */}
              <div className="border border-neutral-200 bg-white p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Partager l&apos;article
                </p>
                <ShareButton
                  title={article.title}
                  text={article.excerpt || "Découvrez cet article"}
                  path={`/articles/${article.slug}`}
                  size="sm"
                  variant="outline"
                  className="w-full justify-center border-black text-black hover:bg-black hover:text-white"
                />
              </div>

              {/* Article info */}
              <div className="border border-neutral-200 bg-white p-5">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Détails
                </p>
                <div className="space-y-3 text-sm">
                  {article.category?.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Rubrique</span>
                      <span className="font-medium text-black">
                        {article.category.name}
                      </span>
                    </div>
                  )}
                  {article.reading_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Lecture</span>
                      <span className="font-medium text-black">
                        {article.reading_time} min
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Vues</span>
                    <span className="font-medium text-black">
                      {article.view_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Commentaires</span>
                    <span className="font-medium text-black">
                      {displayedCommentTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back link */}
              <Link
                href="/articles"
                className="flex items-center justify-center gap-2 border border-black bg-black px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Tous les articles
              </Link>
            </aside>
          </div>
        </div>
      </div>

      {/* ===== COMMENTS SECTION ===== */}
      {article.allow_comments && (
        <section className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-12">
            <div className="mx-auto max-w-3xl">
              {/* Section header */}
              <div className="mb-10 flex items-center gap-4">
                <div className="h-px w-8 bg-[#c9a961]" />
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-black">
                  Commentaires
                </h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                  {displayedCommentTotal}
                </span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              {/* Comment form */}
              <form
                onSubmit={handleSubmitComment}
                className="mb-12 border border-neutral-200 bg-[#fafaf9] p-6"
              >
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 flex-shrink-0 border border-neutral-200">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-black text-white text-xs font-bold">
                      {user?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder={
                        user
                          ? "Partagez votre perspective…"
                          : "Connectez-vous pour commenter…"
                      }
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="mb-3 resize-none border-neutral-200 bg-white text-black focus:border-[#c9a961] focus:ring-0"
                      disabled={!user}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={!user || !comment.trim() || isSubmitting}
                        className="bg-black text-white hover:bg-neutral-800"
                        size="sm"
                      >
                        <Send className="mr-2 h-3.5 w-3.5" />
                        {isSubmitting ? "Publication…" : "Publier"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comments list */}
              {commentsLoading ? (
                <p className="text-center text-sm text-neutral-400">
                  Chargement…
                </p>
              ) : commentTree.length === 0 ? (
                <div className="border border-neutral-200 bg-[#fafaf9] p-10 text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                  <p className="text-neutral-500">
                    Aucun commentaire pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commentTree.map((commentItem) => renderComment(commentItem))}
                </div>
              )}

              {/* Pagination */}
              {commentsMeta.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border border-neutral-200 bg-[#fafaf9] p-4">
                  <p className="text-sm text-neutral-500">
                    Page {commentsMeta.page} / {commentsMeta.totalPages}
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
                      className="border-neutral-200 hover:bg-white"
                    >
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        commentsPage >= commentsMeta.totalPages ||
                        commentsLoading
                      }
                      onClick={() => {
                        setExpandedReplies({});
                        setCommentsPage((prev) =>
                          Math.min(commentsMeta.totalPages, prev + 1),
                        );
                      }}
                      className="border-neutral-200 hover:bg-white"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="border-t-2 border-black bg-white py-8">
        <div className="mx-auto max-w-[1400px] px-6 text-center lg:px-12">
          <Link
            href="/articles"
            className="font-[family-name:var(--font-playfair)] text-xl font-bold text-black hover:text-[#c9a961]"
          >
            LE JOURNAL
          </Link>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-neutral-400">
            Myke Industrie Magazine · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
