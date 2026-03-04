"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, MessageCircle, ArrowRight, BookOpen } from "lucide-react";

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

export default function ArticleCard({
  article,
  index = 0,
  variant = "default",
}: ArticleCardProps) {
  const publishedDate = formatDate(article.published_at || article.created_at);

  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link href={`/articles/${article.slug}`} className="group block">
          <div className="relative overflow-hidden rounded-2xl bg-white border border-stone-200 shadow-xl shadow-stone-900/8 transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/12">
            {/* Image */}
            <div className="relative aspect-[21/9] overflow-hidden">
              <Image
                src={article.thumbnail_url || "/images/placeholder-article.svg"}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-103"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />

              {/* Top label */}
              <div className="absolute top-5 left-6 flex items-center gap-2">
                {article.category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm">
                    {article.category.name}
                  </span>
                )}
                <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-white backdrop-blur-sm">
                  À la une
                </span>
              </div>
            </div>

            {/* Content overlay */}
            <div className="absolute inset-x-0 bottom-0 px-7 pb-7 pt-16">
              <h3 className="font-[family-name:var(--font-playfair)] text-[2rem] font-bold leading-tight text-white drop-shadow-sm md:text-[2.6rem]">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/80 line-clamp-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                  {article.excerpt}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {publishedDate}
                </span>
                {article.reading_time && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {article.reading_time} min de lecture
                  </span>
                )}
                {(article.comment_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {article.comment_count} commentaires
                  </span>
                )}
                <span className="ml-auto hidden items-center gap-1.5 text-amber-300 transition-all group-hover:gap-3 sm:inline-flex">
                  Lire l&apos;article <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.05 }}
      >
        <Link href={`/articles/${article.slug}`} className="group block">
          <div className="flex gap-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-stone-300 hover:shadow-md">
            <div className="relative h-28 w-40 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={article.thumbnail_url || "/images/placeholder-article.svg"}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              {article.category && (
                <span className="mb-1 inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  {article.category.name}
                </span>
              )}
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold leading-snug text-stone-900 transition-colors group-hover:text-amber-800 line-clamp-2">
                {article.title}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {publishedDate}
                </span>
                {article.reading_time && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.reading_time} min
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Default card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
    >
      <Link href={`/articles/${article.slug}`} className="group block h-full">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-400 hover:border-stone-300 hover:shadow-lg hover:-translate-y-0.5">
          {/* Image */}
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={article.thumbnail_url || "/images/placeholder-article.svg"}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-600 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            {article.category && (
              <div className="absolute top-3 left-3">
                <span className="inline-block rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                  {article.category.name}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col p-5">
            {/* Date */}
            <div className="mb-3 flex items-center gap-3 text-[11px] text-stone-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {publishedDate}
              </span>
              {article.reading_time && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.reading_time} min
                </span>
              )}
              {(article.comment_count ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 ml-auto">
                  <MessageCircle className="h-3 w-3" />
                  {article.comment_count}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold leading-snug text-stone-900 transition-colors group-hover:text-amber-800 line-clamp-2 flex-1">
              {article.title}
            </h3>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="mt-2 text-sm leading-relaxed text-stone-500 line-clamp-2" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                {article.excerpt}
              </p>
            )}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
              <span className="flex items-center gap-1.5 text-xs text-stone-400">
                <BookOpen className="h-3.5 w-3.5" />
                Lire l&apos;article
              </span>
              <ArrowRight className="h-4 w-4 text-amber-500 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
