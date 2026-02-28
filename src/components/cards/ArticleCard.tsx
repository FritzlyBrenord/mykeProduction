"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, User, Calendar, MessageCircle } from "lucide-react";
import { Article } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ArticleCardProps {
  article: Article;
  index?: number;
  variant?: "default" | "horizontal" | "featured";
}

export default function ArticleCard({
  article,
  index = 0,
  variant = "default",
}: ArticleCardProps) {
  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/articles/${article.slug}`}>
          <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200">
            <div className="flex flex-col sm:flex-row">
              <div className="relative w-full sm:w-48 h-48 sm:h-auto overflow-hidden">
                <Image
                  src={
                    article.thumbnail_url || "/images/placeholder-article.jpg"
                  }
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <CardContent className="flex-1 p-5">
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  {article.category && (
                    <Badge variant="secondary" className="text-xs">
                      {article.category.name}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(article.published_at || article.created_at)}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-playfair)] font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {article.reading_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.reading_time} min de lecture
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Commentaires
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Link href={`/articles/${article.slug}`}>
          <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-slate-200">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image
                src={article.thumbnail_url || "/images/placeholder-article.jpg"}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {article.category && (
                  <Badge className="bg-amber-500 text-white mb-3">
                    {article.category.name}
                  </Badge>
                )}
                <h3 className="font-[family-name:var(--font-playfair)] font-bold text-2xl text-white mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-white/80 text-sm line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(article.published_at || article.created_at)}
                  </span>
                  {article.reading_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {article.reading_time} min
                    </span>
                  )}
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
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/articles/${article.slug}`}>
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200 h-full">
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={article.thumbnail_url || "/images/placeholder-article.jpg"}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {article.category && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-white/90 text-slate-800">
                  {article.category.name}
                </Badge>
              </div>
            )}
          </div>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(article.published_at || article.created_at)}
              </span>
              {article.reading_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.reading_time} min
                </span>
              )}
            </div>
            <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {article.title}
            </h3>
            <p className="text-slate-600 text-sm line-clamp-3">
              {article.excerpt}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
