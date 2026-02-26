import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Tag, Eye } from 'lucide-react';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/constants/articles';

interface ArticleDetailModalProps {
  article: any;
  onClose: () => void;
}

export function ArticleDetailModal({ article, onClose }: ArticleDetailModalProps) {
  if (!article) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--card)] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--foreground)] pr-8 line-clamp-1">{article.title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--accent)] rounded-full transition-colors absolute right-4 top-4"
            >
              <X className="w-5 h-5 text-[var(--muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-1">
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(article.status))}>
                  {getStatusLabel(article.status)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(article.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {article.author?.full_name || 'Anonyme'}
              </div>
              <div className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {article.categories?.length > 0
                  ? article.categories.map((c: string) => getCategoryLabel(c)).join(', ')
                  : (article.category?.name || '-')}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.view_count || 0} vues
              </div>
            </div>

            {article.thumbnail_url && (
              <div className="w-full h-64 rounded-xl overflow-hidden bg-[var(--accent)]">
                <img 
                  src={article.thumbnail_url} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {article.excerpt && (
              <div className="text-[var(--foreground)] font-medium text-lg border-l-4 border-[var(--primary)] pl-4">
                {article.excerpt}
              </div>
            )}

            <div className="article-content max-w-none">
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
