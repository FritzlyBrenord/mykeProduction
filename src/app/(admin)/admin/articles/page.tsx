'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Archive,
  FileText,
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useArticles, useDeleteArticle, useBulkDeleteArticles } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { getCategoryLabel } from '@/lib/constants/articles';
import { ArticleDetailModal } from '@/components/admin/ArticleDetailModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function ArticlesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const limit = 10;
  
  const { data, isLoading } = useArticles({
    status: statusFilter,
    search: search.length >= 3 ? search : undefined, // Recherche après 3 car. pour perf
    page,
    limit,
  });
  
  const deleteMutation = useDeleteArticle();
  const bulkDeleteMutation = useBulkDeleteArticles();

  const articles = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(articles.map((a: any) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet article ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Voulez-vous vraiment supprimer ${selectedIds.length} article(s) ?`)) {
      bulkDeleteMutation.mutate(selectedIds, {
        onSuccess: () => {
          setSelectedIds([]);
          // Retour a la p.1 si on a vidé la page courante
          if (articles.length === selectedIds.length && page > 1) {
            setPage(page - 1);
          }
        },
      });
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Articles</h1>
          <p className="text-[var(--muted)] mt-1">Gérez vos articles et leur contenu</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer ({selectedIds.length})
            </Button>
          )}
          <Link href="/admin/articles/nouveau">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvel article
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
          <option value="scheduled">Programmé</option>
          <option value="archived">Archivé</option>
        </select>
      </motion.div>

      {/* Articles Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full relative">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="py-4 px-4 w-12 text-center text-[var(--muted)]">
                  <Checkbox 
                    checked={articles.length > 0 && selectedIds.length === articles.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Article</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Auteur</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Catégorie</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Vues</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Date</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--primary)]" />
                    <p className="mt-2 text-[var(--muted)]">Chargement des articles...</p>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="mx-auto w-16 h-16 bg-[var(--accent)] rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-8 h-8 text-[var(--muted)]" />
                    </div>
                    <p className="text-[var(--foreground)] font-medium">Aucun article trouvé</p>
                    <p className="text-[var(--muted)] mb-4">Créez votre premier article ou modifiez vos filtres.</p>
                  </td>
                </tr>
              ) : (
                articles.map((article: any) => (
                  <tr key={article.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <Checkbox 
                        checked={selectedIds.includes(article.id)}
                        onCheckedChange={(c) => handleSelect(article.id, c as boolean)}
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-[var(--primary)]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--foreground)] line-clamp-1" title={article.title}>{article.title}</h4>
                          <p className="text-sm text-[var(--muted)] line-clamp-1">{article.excerpt || 'Pas de résumé'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {article.allow_comments && (
                              <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                                <MessageSquare className="w-3 h-3" />
                                Commentaires activés
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--foreground)]">
                      {article.author?.full_name || 'Anonyme'}
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--foreground)]">
                      {article.category_id 
                        ? getCategoryLabel(article.category_id)
                        : (article.category?.name || '-')}
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(article.status))}>
                        {getStatusLabel(article.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--foreground)]">
                      {article.view_count?.toLocaleString() || 0}
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--muted)]">
                      {formatDate(article.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedArticle(article)}
                          className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors" 
                          title="Voir"
                        >
                          <Eye className="w-4 h-4 text-[var(--muted)]" />
                        </button>
                        <Link href={`/admin/articles/${article.id}/modifier`}>
                          <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors" title="Modifier">
                            <Edit className="w-4 h-4 text-[var(--muted)]" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => handleDelete(article.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group" 
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              Affichage de {((page - 1) * limit) + 1} à {Math.min(page * limit, meta.total)} sur {meta.total} articles
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
      {/* Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </motion.div>
  );
}
