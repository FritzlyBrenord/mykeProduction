'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Video,
  Play,
  Eye,
  Edit,
  Trash2,
  Upload,
  Youtube,
  Lock,
  Users,
  Globe,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Mock data
const mockVideos = [
  {
    id: '1',
    title: 'Introduction à la chimie organique',
    slug: 'intro-chimie-organique',
    video_type: 'youtube',
    video_url: 'https://youtube.com/watch?v=...',
    access_type: 'public',
    price: 0,
    status: 'published',
    view_count: 1234,
    created_at: '2026-02-20T10:00:00Z',
  },
  {
    id: '2',
    title: 'Réactions de substitution avancées',
    slug: 'reactions-substitution',
    video_type: 'upload',
    video_url: '/videos/...',
    access_type: 'members',
    price: 0,
    status: 'published',
    view_count: 567,
    created_at: '2026-02-22T14:30:00Z',
  },
  {
    id: '3',
    title: 'Synthèse de molécules complexes',
    slug: 'synthese-molecules',
    video_type: 'upload',
    video_url: '/videos/...',
    access_type: 'paid',
    price: 49.99,
    status: 'published',
    view_count: 89,
    created_at: '2026-02-23T09:00:00Z',
  },
  {
    id: '4',
    title: 'Cours sur la chromatographie',
    slug: 'cours-chromatographie',
    video_type: 'vimeo',
    video_url: 'https://vimeo.com/...',
    access_type: 'public',
    price: 0,
    status: 'draft',
    view_count: 0,
    created_at: '2026-02-24T11:00:00Z',
  },
];

const accessTypeConfig = {
  public: { label: 'Public', icon: Globe, color: 'text-green-500 bg-green-500/10' },
  members: { label: 'Membres', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  paid: { label: 'Payant', icon: Lock, color: 'text-amber-500 bg-amber-500/10' },
};

const videoTypeConfig = {
  upload: { label: 'Upload', icon: Upload },
  youtube: { label: 'YouTube', icon: Youtube },
  vimeo: { label: 'Vimeo', icon: Video },
};

export default function VideosPage() {
  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<string>('');
  
  const filteredVideos = mockVideos.filter((v) => {
    if (accessFilter && v.access_type !== accessFilter) return false;
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockVideos.length,
    public: mockVideos.filter((v) => v.access_type === 'public').length,
    members: mockVideos.filter((v) => v.access_type === 'members').length,
    paid: mockVideos.filter((v) => v.access_type === 'paid').length,
    totalViews: mockVideos.reduce((acc, v) => acc + v.view_count, 0),
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Vidéos</h1>
          <p className="text-[var(--muted)] mt-1">Gérez votre vidéothèque</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle vidéo
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total vidéos</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Public</p>
          <p className="text-2xl font-bold text-green-500">{stats.public}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Membres</p>
          <p className="text-2xl font-bold text-blue-500">{stats.members}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Payant</p>
          <p className="text-2xl font-bold text-amber-500">{stats.paid}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Vues totales</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{stats.totalViews.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher une vidéo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={accessFilter}
          onChange={(e) => setAccessFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les accès</option>
          <option value="public">Public</option>
          <option value="members">Membres</option>
          <option value="paid">Payant</option>
        </select>
      </motion.div>

      {/* Videos Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVideos.map((video) => {
          const accessConfig = accessTypeConfig[video.access_type as keyof typeof accessTypeConfig];
          const AccessIcon = accessConfig.icon;
          const videoType = videoTypeConfig[video.video_type as keyof typeof videoTypeConfig];
          const VideoTypeIcon = videoType.icon;

          return (
            <div
              key={video.id}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-dark)]/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-16 h-16 text-[var(--primary)]/30" />
                </div>
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-gray-900 ml-1" />
                  </button>
                </div>
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1', accessConfig.color)}>
                    <AccessIcon className="w-3 h-3" />
                    {accessConfig.label}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--card)]/90 text-[var(--foreground)] flex items-center gap-1">
                    <VideoTypeIcon className="w-3 h-3" />
                    {videoType.label}
                  </span>
                </div>
                
                {/* Status */}
                <div className="absolute bottom-3 left-3">
                  <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(video.status))}>
                    {getStatusLabel(video.status)}
                  </span>
                </div>
                
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
                    <Edit className="w-4 h-4 text-gray-900" />
                  </button>
                  <button className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-1">
                  {video.title}
                </h3>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-4">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>{video.view_count.toLocaleString()} vues</span>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  {video.access_type === 'paid' ? (
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatPrice(video.price)}
                    </span>
                  ) : (
                    <span className="text-green-500 font-medium">
                      {video.access_type === 'public' ? 'Gratuit' : 'Membres'}
                    </span>
                  )}
                  <span className="text-xs text-[var(--muted)]">
                    {formatDate(video.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
