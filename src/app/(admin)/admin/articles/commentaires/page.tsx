'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { useCommentaires, useDeleteCommentaire, useBulkDeleteCommentaires, useUpdateCommentaire } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function CommentairesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const limit = 10;
  
  const { data, isLoading } = useCommentaires({
    status: statusFilter,
    page,
    limit,
  });
  
  const deleteMutation = useDeleteCommentaire();
  const bulkDeleteMutation = useBulkDeleteCommentaires();
  const updateMutation = useUpdateCommentaire();

  const commentaires = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(commentaires.map((c: any) => c.id));
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
    if (window.confirm('Voulez-vous vraiment supprimer ce commentaire ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Voulez-vous vraiment supprimer ${selectedIds.length} commentaire(s) ?`)) {
      bulkDeleteMutation.mutate(selectedIds, {
        onSuccess: () => {
          setSelectedIds([]);
          if (commentaires.length === selectedIds.length && page > 1) {
            setPage(page - 1);
          }
        },
      });
    }
  };

  const handleUpdateStatus = (id: string, status: string) => {
     updateMutation.mutate({ id, status });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      default: return status;
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Commentaires</h1>
          <p className="text-[var(--muted)] mt-1">Gérez les commentaires des articles</p>
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
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Rejeté</option>
        </select>
      </motion.div>

      {/* Commentaires Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full relative">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="py-4 px-4 w-12 text-center text-[var(--muted)]">
                  <Checkbox 
                    checked={commentaires.length > 0 && selectedIds.length === commentaires.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Commentaire</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Article</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Date</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--primary)]" />
                    <p className="mt-2 text-[var(--muted)]">Chargement des commentaires...</p>
                  </td>
                </tr>
              ) : commentaires.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="mx-auto w-16 h-16 bg-[var(--accent)] rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-[var(--muted)]" />
                    </div>
                    <p className="text-[var(--foreground)] font-medium">Aucun commentaire trouvé</p>
                  </td>
                </tr>
              ) : (
                commentaires.map((commentaire: any) => (
                  <tr key={commentaire.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <Checkbox 
                        checked={selectedIds.includes(commentaire.id)}
                        onCheckedChange={(c) => handleSelect(commentaire.id, c as boolean)}
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                          {commentaire.user?.avatar_url ? (
                             <img src={commentaire.user?.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                             <User className="w-5 h-5 text-[var(--primary)]" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-[var(--foreground)] text-sm">{commentaire.user?.full_name || 'Utilisateur anonyme'}</h4>
                          <p className="text-sm text-[var(--muted)] line-clamp-2 mt-1 whitespace-pre-line">{commentaire.content}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--muted)] max-w-[200px] truncate" title={commentaire.article?.title}>
                      {commentaire.article?.title || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(commentaire.status))}>
                        {getStatusLabel(commentaire.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--muted)]">
                      {formatDate(commentaire.created_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                         {commentaire.status !== 'approved' && (
                           <button 
                             onClick={() => handleUpdateStatus(commentaire.id, 'approved')}
                             disabled={updateMutation.isPending}
                             className="p-2 hover:bg-green-500/10 rounded-lg transition-colors group" 
                             title="Approuver"
                           >
                             <CheckCircle className="w-4 h-4 text-green-500" />
                           </button>
                         )}
                         {commentaire.status !== 'rejected' && (
                           <button 
                             onClick={() => handleUpdateStatus(commentaire.id, 'rejected')}
                             disabled={updateMutation.isPending}
                             className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors group" 
                             title="Rejeter"
                           >
                             <XCircle className="w-4 h-4 text-amber-500" />
                           </button>
                         )}
                        <button 
                          onClick={() => handleDelete(commentaire.id)}
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
              Affichage de {((page - 1) * limit) + 1} à {Math.min(page * limit, meta.total)} sur {meta.total} commentaires
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
    </motion.div>
  );
}
