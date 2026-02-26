import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPrice(amount: number, currency = 'USD') {
  if (amount == null || Number.isNaN(amount)) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateSlug(text: string) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'published':
    case 'approved':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'draft':
    case 'pending':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'archived':
    case 'rejected':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'scheduled':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case 'published': return 'Publié';
    case 'draft': return 'Brouillon';
    case 'archived': return 'Archivé';
    case 'scheduled': return 'Programmé';
    case 'approved': return 'Approuvé';
    case 'pending': return 'En attente';
    case 'rejected': return 'Rejeté';
    default: return status;
  }
}

export function truncateText(text: string, length: number) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}
