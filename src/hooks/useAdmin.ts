'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

// Dashboard Stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Formations
export function useFormations(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'formations', params?.status, params?.search],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);

      const res = await fetch(`/api/admin/formations?${searchParams}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to fetch formations');
      }
      return res.json();
    },
  });
}

export function useCreateFormation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/formations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to create formation');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Formation créée avec succès' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'formations'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFormation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/formations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to update formation');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Formation mise à jour' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'formations'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFormation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/formations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to delete formation');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Formation archivée' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'formations'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Articles
export function useArticles(params?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'articles', params?.status, params?.search, params?.page, params?.limit],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const res = await fetch(`/api/admin/articles?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch articles');
      return res.json();
    },
  });
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['admin', 'article', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/articles/${id}`);
      if (!res.ok) throw new Error('Failed to fetch article');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateArticle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create article');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Article créé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateArticle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update article');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      toast({ title: 'Succès', description: 'Article mis à jour' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'article', id] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteArticle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete article');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Article supprimé' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkDeleteArticles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/admin/articles?ids=${ids.join(',')}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to bulk delete articles');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Articles supprimés' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Commentaires
export function useCommentaires(params?: { article_id?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'commentaires', params?.article_id, params?.status, params?.page, params?.limit],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.article_id) searchParams.set('article_id', params.article_id);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const res = await fetch(`/api/admin/commentaires?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch commentaires');
      return res.json();
    },
  });
}

export function useUpdateCommentaire() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/commentaires/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update commentaire');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Commentaire mis à jour' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commentaires'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCommentaire() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/commentaires/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete commentaire');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Commentaire supprimé' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commentaires'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkDeleteCommentaires() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/admin/commentaires?ids=${ids.join(',')}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to bulk delete commentaires');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Commentaires supprimés' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commentaires'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}
// Categories
export function useCategories(params?: { type?: string }) {
  return useQuery({
    queryKey: ['admin', 'categories', params?.type],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);

      const res = await fetch(`/api/admin/categories?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
  });
}


// Produits
export function useProduits(params?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'produits', params?.type, params?.status],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.status) searchParams.set('status', params.status);

      const res = await fetch(`/api/admin/produits?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch produits');
      return res.json();
    },
  });
}

export function useCreateProduit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/produits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create produit');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Produit créé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'produits'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useProduit(id: string) {
  return useQuery({
    queryKey: ['admin', 'produit', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/produits/${id}`);
      if (!res.ok) throw new Error('Failed to fetch produit');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUpdateProduit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/produits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update produit');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      toast({ title: 'Succès', description: 'Produit mis à jour' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'produits'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'produit', id] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProduit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/produits/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete produit');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Produit supprimé' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'produits'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Commandes
export function useCommandes(params?: { status?: string }) {
  return useQuery({
    queryKey: ['admin', 'commandes', params?.status],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);

      const res = await fetch(`/api/admin/commandes?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch commandes');
      return res.json();
    },
  });
}

export function useUpdateCommandeStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/commandes/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'commandes'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Utilisateurs
export function useUtilisateurs() {
  return useQuery({
    queryKey: ['admin', 'utilisateurs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/utilisateurs');
      if (!res.ok) throw new Error('Failed to fetch utilisateurs');
      return res.json();
    },
  });
}

export function useUpdateUserRole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/utilisateurs/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Rôle mis à jour' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'utilisateurs'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Inventaire Chimique
export function useInventaireChimique() {
  return useQuery({
    queryKey: ['admin', 'inventaire-chimique'],
    queryFn: async () => {
      const res = await fetch('/api/admin/inventaire');
      if (!res.ok) throw new Error('Failed to fetch inventaire');
      return res.json();
    },
  });
}

export function useCreateInventaireMovement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/inventaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create movement');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Mouvement enregistré' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventaire-chimique'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Coupons
export function useCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const res = await fetch('/api/admin/coupons');
      if (!res.ok) throw new Error('Failed to fetch coupons');
      return res.json();
    },
  });
}

export function useCreateCoupon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create coupon');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Succès', description: 'Coupon créé avec succès' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Audit Logs
export function useAuditLogs(params?: { action?: string; userId?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params?.action, params?.userId],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.action) searchParams.set('action', params.action);
      if (params?.userId) searchParams.set('userId', params.userId);

      const res = await fetch(`/api/admin/audit-logs?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
  });
}

// Videos
export function useVideos() {
  return useQuery({
    queryKey: ['admin', 'videos'],
    queryFn: async () => {
      const res = await fetch('/api/admin/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      return res.json();
    },
  });
}

// Paiements
export function usePaiements() {
  return useQuery({
    queryKey: ['admin', 'paiements'],
    queryFn: async () => {
      const res = await fetch('/api/admin/paiements');
      if (!res.ok) throw new Error('Failed to fetch paiements');
      return res.json();
    },
  });
}

// Upload
export function useUpload() {
  return useMutation({
    mutationFn: async ({ files, folder = 'general' }: { files: File[]; folder?: string }) => {
      const formData = new FormData();
      formData.append('folder', folder);
      files.forEach((file) => formData.append('file', file));

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to upload files');
      }
      return res.json();
    },
  });
}
