"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, MessageCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Article } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

type ArticleCardData = Article & {
  comment_count?: number;
};

interface ArticleCardProps {
  article: ArticleCardData;
  index?: number;
  variant?: "default" | "horizontal" | "featured";
}

const editorialHeadlineClass = "font-[family-name:var(--font-playfair)]";

export default function ArticleCard({
  article,
  index = 0,
  variant = "default",
}: ArticleCardProps) {
  const publishedDate = formatDate(article.published_at || article.created_at);

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.05 }}
      >
        <Link href={`/articles/${article.slug}`}>
          <Card className="group overflow-hidden border-amber-200/70 bg-white/90 backdrop-blur hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-[220px,1fr]">
              <div className="relative h-56 sm:h-full overflow-hidden">
                <Image
                  src={article.thumbnail_url || "/images/placeholder-article.svg"}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              </div>

              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-500">
                  {article.category && (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                      {article.category.name}
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {publishedDate}
                  </span>
                </div>

                <h3
                  className={`${editorialHeadlineClass} text-2xl font-semibold text-slate-900 leading-tight mb-3 group-hover:text-amber-900 transition-colors`}
                >
                  {article.title}
                </h3>

                <p
                  className="text-slate-600 leading-relaxed line-clamp-3"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {article.excerpt}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  {article.reading_time && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {article.reading_time} min de lecture
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {article.comment_count ?? 0} commentaires
                  </span>
                </div>
              </CardContent>
            </div>
          </Card>
        </Link>
      </motion.div>
    );
  }

  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <Link href={`/articles/${article.slug}`}>
          <Card className="group overflow-hidden border-amber-200/70 shadow-lg shadow-amber-950/10 hover:shadow-2xl hover:shadow-amber-950/15 transition-all duration-500 bg-white/95">
            <div className="relative aspect-[16/8] overflow-hidden">
              <Image
                src={article.thumbnail_url || "/images/placeholder-article.svg"}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <div className="flex items-center gap-2 text-amber-100 mb-3">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">Edition du moment</span>
                </div>

                {article.category && (
                  <Badge className="mb-3 bg-amber-200 text-amber-950 hover:bg-amber-200">
                    {article.category.name}
                  </Badge>
                )}

                <h3 className={`${editorialHeadlineClass} text-3xl md:text-4xl font-semibold text-white leading-tight mb-3`}>
                  {article.title}
                </h3>

                <p
                  className="text-white/85 max-w-3xl line-clamp-2"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {article.excerpt}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {publishedDate}
                  </span>
                  {article.reading_time && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {article.reading_time} min
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {article.comment_count ?? 0} commentaires
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
    >
      <Link href={`/articles/${article.slug}`}>
        <Card className="group h-full overflow-hidden border-amber-200/70 bg-white/90 hover:bg-white transition-all duration-500 hover:shadow-xl hover:shadow-amber-900/10">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={article.thumbnail_url || "/images/placeholder-article.svg"}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {article.category && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-white/90 text-slate-900 hover:bg-white/90">
                  {article.category.name}
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {publishedDate}
              </span>
              {article.reading_time && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.reading_time} min
                </span>
              )}
            </div>

            <h3 className={`${editorialHeadlineClass} text-xl font-semibold text-slate-900 mb-3 leading-tight group-hover:text-amber-900 transition-colors line-clamp-2`}>
              {article.title}
            </h3>

            <p
              className="text-slate-600 line-clamp-3"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {article.excerpt}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
